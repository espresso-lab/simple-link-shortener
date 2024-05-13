use std::env;

use once_cell::sync::{Lazy, OnceCell};
use salvo::{
    http::{header, HeaderValue},
    prelude::*,
};
use serde::{Deserialize, Serialize};
use sqlx::{
    migrate::MigrateDatabase, sqlite::SqliteQueryResult, Error, FromRow, Sqlite, SqlitePool,
};

static CORS_ALLOW_ORIGINS: Lazy<String> =
    Lazy::new(|| env::var("CORS_ALLOW_ORIGINS").unwrap_or("*".to_string()));
static SQLITE: OnceCell<SqlitePool> = OnceCell::new();

#[inline]
fn get_sqlite() -> &'static SqlitePool {
    SQLITE.get().unwrap()
}

#[derive(FromRow, Serialize, Deserialize, Debug)]
struct Link {
    id: Option<i64>,
    title: String,
    slug: String,
    url: String,
    created_at: Option<String>,
    updated_at: Option<String>,
}

#[handler]
async fn get_links(_req: &mut Request, res: &mut Response) {
    let data = sqlx::query_as::<_, Link>("SELECT * FROM links")
        .fetch_all(get_sqlite())
        .await;
    match data {
        Ok(data) => res.render(Json(data)),
        Err(_) => {
            res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
            return;
        }
    }
}

#[handler]
async fn get_link_by_id(req: &mut Request, res: &mut Response) {
    let id = req.params().get("id").cloned().unwrap_or_default();
    let data = sqlx::query_as::<_, Link>("SELECT * FROM links WHERE id = ?")
        .bind(id)
        .fetch_one(get_sqlite())
        .await;
    match data {
        Ok(link) => res.render(Json(link)),
        Err(_) => {
            res.status_code(StatusCode::NOT_FOUND);
            return;
        }
    }
}

#[handler]
async fn create_link(req: &mut Request, res: &mut Response) {
    let link = req.parse_json::<Link>().await.unwrap();
    let query = "INSERT INTO links (title, slug, url) VALUES (?, ?, ?)";
    match sqlx::query(query)
        .bind(&link.title)
        .bind(&link.slug)
        .bind(&link.url)
        .execute(get_sqlite())
        .await
    {
        Ok(_) => res.status_code(StatusCode::CREATED),
        Err(err) => {
            res.status_code(StatusCode::UNPROCESSABLE_ENTITY)
                .render(Text::Json(format!("{{\"message\": \"{}\"}}", err)));
            return;
        }
    };
}

#[handler]
async fn update_link(req: &mut Request, res: &mut Response) {
    let id: i64 = req.param("id").unwrap();
    let link = req.parse_json::<Link>().await.unwrap();
    let query = "UPDATE links SET title = ?, slug = ?, url = ? WHERE id = ?";
    match sqlx::query(query)
        .bind(&link.title)
        .bind(&link.slug)
        .bind(&link.url)
        .bind(id)
        .execute(get_sqlite())
        .await
    {
        Ok(_) => res.status_code(StatusCode::NO_CONTENT),
        Err(_) => res.status_code(StatusCode::INTERNAL_SERVER_ERROR),
    };
}

#[handler]
async fn delete_link(req: &mut Request, _res: &mut Response) {
    let id = req.params().get("id").cloned().unwrap_or_default();
    let query = "DELETE FROM links WHERE id = ?";
    sqlx::query(query)
        .bind(id)
        .execute(get_sqlite())
        .await
        .unwrap();
}

#[handler]
async fn redirect(req: &mut Request, res: &mut Response) {
    let slug = req.params().get("slug").cloned().unwrap_or_default();
    let data = sqlx::query_as::<_, Link>("SELECT * FROM links WHERE slug = ?")
        .bind(slug)
        .fetch_one(get_sqlite())
        .await;
    match data {
        Ok(link) => res.render(Redirect::found(link.url)),
        Err(_) => {
            res.status_code(StatusCode::NOT_FOUND);
            return;
        }
    }
}

async fn create_schema(db_url: &str) -> Result<SqliteQueryResult, Error> {
    let pool = SqlitePool::connect(db_url).await?;
    let query = "
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
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
        HeaderValue::from_static(CORS_ALLOW_ORIGINS.as_str()),
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
fn ok(_req: &mut Request, res: &mut Response) {
    res.status_code(StatusCode::OK);
}

#[tokio::main]
async fn main() {
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

    let router = Router::new()
        .hoop(cors)
        .hoop(content_type)
        .push(Router::with_path("status").get(ok))
        .push(
            Router::with_path("links")
                .get(get_links)
                .post(create_link)
                .options(ok)
                .push(
                    Router::with_path("<id>")
                        .get(get_link_by_id)
                        .put(update_link)
                        .delete(delete_link)
                        .options(ok),
                ),
        )
        .push(Router::with_path("icon.svg").get(StaticFile::new("static/icon.svg")))
        .push(Router::with_path("<slug>").get(redirect))
        .push(
            Router::with_path("<**path>").get(
                StaticDir::new(["static"])
                    .defaults("index.html")
                    .auto_list(true),
            ),
        );

    let acceptor = TcpListener::new("0.0.0.0:3000").bind().await;
    Server::new(acceptor).serve(router).await;
}
