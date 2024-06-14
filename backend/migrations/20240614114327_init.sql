PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS links (
    slug TEXT PRIMARY KEY NOT NULL,
    url TEXT NOT NULL,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
);
