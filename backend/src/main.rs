mod models;

use crate::models::links::{Link, LinkClickTracking, LinkWithSlugUrl};
use actix_cors::Cors;
use actix_files as fs;
use actix_web::middleware::Logger;
use actix_web::web::Data;
use actix_web::{delete, get, post, web, App, HttpRequest, HttpResponse, HttpServer, Responder};
use env_logger::Env;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{migrate::MigrateDatabase, Sqlite, SqlitePool};
use std::env;

struct AppState {
    db_pool: SqlitePool,
    forward_url: String,
}

#[get("/links")]
async fn get_links(data: Data<AppState>) -> impl Responder {
    let result: Result<Vec<Link>, sqlx::Error> = sqlx::query_as(
        "SELECT t1.*, COUNT(t2.datetime) as clicks FROM links t1
        LEFT JOIN link_click_tracking t2 ON t1.slug = t2.slug
        GROUP BY t1.slug",
    )
        .fetch_all(&data.db_pool)
        .await;

    match result {
        Ok(links) => {
            let links: Vec<LinkWithSlugUrl> = links
                .into_iter()
                .map(|link| LinkWithSlugUrl {
                    url_slug: format!("{}/{}", data.forward_url.trim_end_matches("/"), link.slug),
                    slug: link.slug,
                    url: link.url,
                    created_at: link.created_at,
                    updated_at: link.updated_at,
                    clicks: link.clicks,
                })
                .collect();
            HttpResponse::Ok().json(links)
        }
        Err(err) => HttpResponse::InternalServerError().json(err.to_string()),
    }
}

#[get("/links/{slug}/clicks")]
async fn get_link_clicks(data: Data<AppState>, path: web::Path<String>) -> impl Responder {
    let result: Result<Vec<LinkClickTracking>, sqlx::Error> =
        sqlx::query_as("SELECT * FROM link_click_tracking WHERE slug = $1")
            .bind(path.into_inner())
            .fetch_all(&data.db_pool)
            .await;

    match result {
        Ok(clicks) => HttpResponse::Ok().json(clicks),
        Err(err) => HttpResponse::InternalServerError().json(err.to_string()),
    }
}

#[post("/links")]
async fn create_link(data: Data<AppState>, payload: web::Json<Link>) -> impl Responder {
    let link = payload.into_inner();

    let result: Result<_, sqlx::Error> =
        sqlx::query("INSERT INTO links (slug, url) VALUES ($1, $2)")
            .bind(&link.slug)
            .bind(&link.url)
            .execute(&data.db_pool)
            .await;

    match result {
        Ok(_) => HttpResponse::Created().finish(),
        Err(err) => HttpResponse::UnprocessableEntity().json(err.to_string()),
    }
}

#[delete("/links/{slug}")]
async fn delete_link(data: Data<AppState>, path: web::Path<String>) -> impl Responder {
    let result: Result<_, sqlx::Error> = sqlx::query("DELETE FROM links WHERE slug = $1")
        .bind(path.into_inner())
        .execute(&data.db_pool)
        .await;

    match result {
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(err) => HttpResponse::InternalServerError().json(err.to_string()),
    }
}

fn get_header(req: &HttpRequest, key: &str) -> String {
    req.headers()
        .get(key)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_string()
}

#[get("/{slug:.*}")]
async fn forward_link(
    req: HttpRequest,
    data: Data<AppState>,
    path: web::Path<String>,
) -> impl Responder {
    let slug = path.into_inner();

    let mut transaction = data.db_pool.begin().await.unwrap();

    let result: Result<Option<String>, sqlx::Error> =
        sqlx::query_scalar("SELECT url FROM links WHERE slug = $1")
            .bind(&slug)
            .fetch_one(&mut transaction)
            .await;

    match result {
        Ok(Some(url)) => {
            sqlx::query("INSERT INTO link_click_tracking (slug, client_ip_address, client_browser) VALUES ($1, $2, $3)")
                .bind(&slug)
                .bind(req.connection_info().realip_remote_addr().unwrap_or("unknown"))
                .bind(get_header(&req, "User-Agent"))
                .execute(&mut transaction)
                .await
                .unwrap();

            transaction.commit().await.unwrap();

            HttpResponse::TemporaryRedirect()
                .append_header(("Location", url))
                .append_header(("Referrer-Policy", "no-referrer"))
                .finish()
        }
        Ok(None) => {
            transaction.rollback().await.unwrap();
            HttpResponse::NotFound().body("Link not found")
        }
        Err(err) => {
            transaction.rollback().await.unwrap();
            HttpResponse::InternalServerError().json(err.to_string())
        }
    }
}

#[get("/status")]
async fn status() -> impl Responder {
    HttpResponse::Ok().body("Ok")
}

async fn setup_database() -> Result<SqlitePool, sqlx::Error> {
    let database_url = "sqlite://db/links.db";

    if !Sqlite::database_exists(database_url).await? {
        Sqlite::create_database(database_url).await?;
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    sqlx::migrate!().run(&pool).await?;

    Ok(pool)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(Env::default().default_filter_or("info"));

    let pool = match setup_database().await {
        Ok(pool) => pool,
        Err(e) => {
            eprintln!("Failed to set up database: {:?}", e);
            return Ok(());
        }
    };

    match sqlx::migrate!().run(&pool).await {
        Ok(_) => println!("Successfully run migrations."),
        Err(e) => {
            eprintln!("Failed to run DB migrations: {:?}", e);
            return Ok(());
        }
    }

    let pool_clone = pool.clone();

    let api = HttpServer::new(move || {
        let app_state = AppState {
            db_pool: pool.clone(),
            forward_url: env::var("FORWARD_URL").unwrap_or("https://example.com/".to_string()),
        };
        let allowed_origins = env::var("CORS_ALLOWED_ORIGINS").unwrap_or("*".to_string());
        let cors = Cors::default()
            .allowed_methods(vec!["OPTIONS", "GET", "POST"])
            .allow_any_header()
            .allowed_origin_fn(move |origin, _| {
                if allowed_origins == "*" {
                    return true;
                }
                let allowed_origins_list: Vec<&str> = allowed_origins
                    .split_terminator(",")
                    .filter(|s| !s.is_empty())
                    .collect();
                allowed_origins_list.contains(&origin.to_str().unwrap())
            });
        App::new()
            .app_data(Data::new(app_state))
            .wrap(Logger::default())
            .wrap(cors)
            .service(status)
            .service(get_links)
            .service(get_link_clicks)
            .service(create_link)
            .service(delete_link)
            .service(
                fs::Files::new("/", "static")
                    .index_file("index.html")
                    .show_files_listing(),
            )
    })
        .bind("0.0.0.0:3000")?
        .run();

    let forwarder = HttpServer::new(move || {
        let app_state = AppState {
            db_pool: pool_clone.clone(),
            forward_url: env::var("FORWARD_URL").unwrap_or("https://example.com/".to_string()),
        };

        App::new()
            .app_data(Data::new(app_state))
            .wrap(Logger::default())
            .service(forward_link)
    })
        .bind("0.0.0.0:3001")?
        .run();

    futures::try_join!(api, forwarder)?;
    Ok(())
}

