PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS link_click_tracking (
    slug TEXT NOT NULL,
    datetime DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    client_ip_address TEXT NOT NULL,
    client_browser TEXT NOT NULL,
    PRIMARY KEY (slug, datetime),
    FOREIGN KEY (slug) REFERENCES links(slug) ON DELETE CASCADE
);
