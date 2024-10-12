CREATE TABLE links
(
    slug       TEXT PRIMARY KEY NOT NULL,
    target_url TEXT             NOT NULL,
    created_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    expires_at DATETIME NULL DEFAULT NULL
);

CREATE TABLE link_click_tracking
(
    slug              TEXT     NOT NULL,
    datetime          DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    client_ip_address TEXT     NOT NULL,
    client_browser    TEXT     NOT NULL,
    expires_at        DATETIME NULL DEFAULT NULL,
    PRIMARY KEY (slug, datetime),
    FOREIGN KEY (slug) REFERENCES links (slug) ON DELETE CASCADE
);