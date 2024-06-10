use confique::Config;
use dotenv::dotenv;
use once_cell::sync::OnceCell;
use salvo::{
    http::{header, HeaderValue},
    prelude::*,
};

use serde::{Deserialize, Serialize};
use sqlx::{
    migrate::MigrateDatabase, sqlite::SqliteQueryResult, Error, FromRow, Sqlite, SqlitePool,
};
use std::sync::OnceLock;
use tokio::join;

static SQLITE: OnceCell<SqlitePool> = OnceCell::new();

#[derive(Config)]
struct Conf {
    #[config(env = "CORS_ALLOW_ORIGINS", default = "*")]
    cors_allow_origins: String,

    #[config(env = "FORWARD_URL", default = "https://example.com/")]
    forward_url: String,
}

fn config() -> &'static Conf {
    static CONFIG: OnceLock<Conf> = OnceLock::new();
    CONFIG.get_or_init(|| Conf::builder().env().load().unwrap())
}

fn sqlite() -> &'static SqlitePool {
    SQLITE.get().unwrap()
}

#[derive(FromRow, Serialize, Deserialize, Debug)]
struct Link {
    slug: String,
    url: String,
    created_at: Option<String>,
    updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct LinkDTO {
    slug: String,
    url: String,
    url_slug: String,
    created_at: String,
    updated_at: String,
}

#[handler]
async fn get_links(_req: &mut Request, res: &mut Response) {
    let data = sqlx::query_as::<_, Link>("SELECT * FROM links")
        .fetch_all(sqlite())
        .await;
    match data {
        Ok(data) => {
            let links = data
                .into_iter()
                .map(|link| LinkDTO {
                    url_slug: format!(
                        "{}/{}",
                        config().forward_url.trim_end_matches("/"),
                        link.slug
                    )
                    .to_string(),
                    created_at: link.created_at.unwrap_or_default(),
                    updated_at: link.updated_at.unwrap_or_default(),
                    slug: link.slug,
                    url: link.url,
                })
                .collect::<Vec<LinkDTO>>();
            res.render(Json(links));
        }
        Err(err) => res
            .status_code(StatusCode::INTERNAL_SERVER_ERROR)
            .render(Json(err.to_string())),
    }
}

#[handler]
async fn create_link(req: &mut Request, res: &mut Response) {
    let link = match req.parse_json::<Link>().await {
        Ok(link) => link,
        Err(err) => {
            return res
                .status_code(StatusCode::UNPROCESSABLE_ENTITY)
                .render(Json(err.to_string()));
        }
    };
    let query = "INSERT INTO links (slug, url) VALUES (?, ?)";
    match sqlx::query(query)
        .bind(&link.slug)
        .bind(&link.url)
        .execute(sqlite())
        .await
    {
        Ok(_) => res.status_code(StatusCode::CREATED),
        Err(err) => {
            return res
                .status_code(StatusCode::UNPROCESSABLE_ENTITY)
                .render(Json(err.to_string()))
        }
    };
}

#[handler]
async fn delete_link(req: &mut Request, res: &mut Response) {
    let slug = req.params().get("slug").cloned().unwrap_or_default();
    let query = "DELETE FROM links WHERE slug = ?";
    match sqlx::query(query).bind(slug).execute(sqlite()).await {
        Ok(_) => res.status_code(StatusCode::NO_CONTENT),
        Err(err) => {
            return res
                .status_code(StatusCode::UNPROCESSABLE_ENTITY)
                .render(Json(err.to_string()));
        }
    };
}

#[handler]
async fn redirect_handler(req: &mut Request, res: &mut Response) {
    let slug = req.params().get("slug").cloned().unwrap_or_default();
    let data = sqlx::query_as::<_, Link>("SELECT * FROM links WHERE slug = ?")
        .bind(slug)
        .fetch_one(sqlite())
        .await;

    match data {
        Ok(link) => res.render(Redirect::found(link.url)),
        Err(_) => {
            res.status_code(StatusCode::NOT_FOUND)
                .render(Text::Plain("Not found."));
        }
    }
}

async fn create_schema(db_url: &str) -> Result<SqliteQueryResult, Error> {
    let pool = SqlitePool::connect(db_url).await?;
    let query = "
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS links (
            slug TEXT PRIMARY KEY NOT NULL,
            url TEXT NOT NULL,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
        );
    ";
    let result = sqlx::query(query).execute(&pool).await;
    pool.close().await;
    result
}

#[handler]
async fn cors(_req: &mut Request, res: &mut Response) {
    res.headers_mut().insert(
        header::ACCESS_CONTROL_ALLOW_ORIGIN,
        HeaderValue::from_static(config().cors_allow_origins.as_str()),
    );

    res.headers_mut().insert(
        header::ACCESS_CONTROL_ALLOW_HEADERS,
        HeaderValue::from_static("*"),
    );

    res.headers_mut().insert(
        header::ACCESS_CONTROL_ALLOW_METHODS,
        HeaderValue::from_static("*"),
    );
}

#[handler]
async fn content_type(_req: &mut Request, res: &mut Response) {
    res.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
}

#[handler]
fn ok_handler(_req: &mut Request, res: &mut Response) {
    res.status_code(StatusCode::OK);
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    tracing_subscriber::fmt().init();

    let db_url = "sqlite://db/links.db";
    if !Sqlite::database_exists(db_url).await.unwrap_or(false) {
        Sqlite::create_database(db_url).await.unwrap();
        match create_schema(db_url).await {
            Ok(_) => println!("DB created successfully"),
            Err(e) => {
                eprintln!("Failed to create schema: {:?}", e);
                return;
            }
        }
    }

    let pool = SqlitePool::connect(db_url).await.unwrap();
    SQLITE.set(pool).unwrap();

    let router_admin = Router::new()
        .hoop(cors)
        .hoop(content_type)
        .push(Router::with_path("status").get(ok_handler))
        .push(
            Router::with_path("links")
                .get(get_links)
                .post(create_link)
                .options(ok_handler)
                .push(
                    Router::with_path("<slug>")
                        .delete(delete_link)
                        .options(ok_handler),
                ),
        )
        .push(Router::with_path("icon.svg").get(StaticFile::new("static/icon.svg")))
        .push(
            Router::with_path("<**path>").get(
                StaticDir::new(["static"])
                    .defaults("index.html")
                    .auto_list(true),
            ),
        );
    let acceptor_admin = TcpListener::new("0.0.0.0:3000").bind().await;

    // Start a separate port for the forwarding service.
    let router_forwarder = Router::new().push(Router::with_path("<slug>").goal(redirect_handler));
    let acceptor_forwarder = TcpListener::new("0.0.0.0:3001").bind().await;

    // Start the servers
    join!(
        Server::new(acceptor_admin).serve(Service::new(router_admin).hoop(Logger::new())),
        Server::new(acceptor_forwarder).serve(Service::new(router_forwarder).hoop(Logger::new()))
    );
}
