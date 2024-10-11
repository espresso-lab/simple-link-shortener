use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Link {
    pub slug: String,
    pub url: String,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub clicks: Option<i32>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LinkWithSlugUrl {
    pub slug: String,
    pub url_slug: String,
    pub url: String,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub clicks: Option<i32>,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct LinkClickTracking {
    pub slug: String,
    pub datetime: Option<NaiveDateTime>,
    pub client_ip_address: String,
    pub client_browser: String,
}