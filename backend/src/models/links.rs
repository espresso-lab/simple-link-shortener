use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Link {
    pub slug: String,
    pub target_url: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    #[sqlx(default)]
    pub expires_at: Option<NaiveDateTime>,
    pub clicks: i32,
    #[sqlx(default)]
    pub shortened_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CreateLinkRequest {
    pub slug: String,
    pub target_url: String,
    pub expires_in_secs: Option<u64>,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct LinkClickTracking {
    pub slug: String,
    pub datetime: Option<NaiveDateTime>,
    pub client_ip_address: String,
    pub client_browser: String,
}