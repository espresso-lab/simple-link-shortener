CREATE TABLE links
(
    slug       TEXT PRIMARY KEY NOT NULL,
    url        TEXT             NOT NULL,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE link_click_tracking
(
    slug              TEXT     NOT NULL,
    datetime          DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    client_ip_address TEXT     NOT NULL,
    client_browser    TEXT     NOT NULL,
    PRIMARY KEY (slug, datetime),
    FOREIGN KEY (slug) REFERENCES links (slug) ON DELETE CASCADE
);