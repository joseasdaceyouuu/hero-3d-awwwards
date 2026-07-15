-- Memory schema for hero-3d-awwwards agent loop.
-- 5 stores: working (in-process, not persisted), episodic, semantic, procedural, anti_patterns.
-- Backends: SQLite (facts + metadata) + LanceDB (embeddings, file-backed).

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- EPISODIC MEMORY — raw past hero sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS episodes (
    id              TEXT PRIMARY KEY,           -- uuid
    timestamp       TEXT NOT NULL,              -- ISO 8601
    brief           TEXT NOT NULL,              -- user request (parsed)
    brief_summary   TEXT NOT NULL,              -- short version for retrieval
    vertical        TEXT,                       -- saas | portfolio | ecommerce | agency | ...
    archetype       TEXT,                       -- 2.5D-Parallax | 3D-Scene | Shaders | Distortion | Text-3D
    stack           TEXT,                       -- r3f | threejs-vanilla | css-3d
    final_score     REAL,                       -- combined auditor + subjective score
    final_subjective_score REAL,
    outcome         TEXT,                       -- success | score_sufficient | stagnated | escalated | max_iterations | aborted | diverged
    user_feedback   TEXT,
    code_hashes     TEXT,                       -- JSON array of {path: hash}
    iterations_json TEXT NOT NULL,              -- full iteration data (graduated compressed by age)
    embedding_id    TEXT,                       -- reference to LanceDB episode_embeddings table
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_episodes_vertical  ON episodes(vertical);
CREATE INDEX IF NOT EXISTS idx_episodes_timestamp ON episodes(timestamp);
CREATE INDEX IF NOT EXISTS idx_episodes_archetype ON episodes(archetype);
CREATE INDEX IF NOT EXISTS idx_episodes_outcome   ON episodes(outcome);

-- ============================================================
-- SEMANTIC MEMORY — atomic facts extracted from episodes
-- ============================================================
CREATE TABLE IF NOT EXISTS semantic_notes (
    id              TEXT PRIMARY KEY,
    content         TEXT NOT NULL,              -- one-sentence atomic fact
    vertical        TEXT,
    category        TEXT,                       -- layout | typography | color | cta | copy | timing | accessibility | performance
    importance      INTEGER DEFAULT 5,          -- 1-10 (10 = critical pattern)
    source_episodes TEXT,                       -- JSON array of episode IDs that support this fact
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    last_accessed   TEXT NOT NULL DEFAULT (datetime('now')),
    access_count    INTEGER DEFAULT 0,
    valid_until     TEXT,                       -- NULL = always valid; ISO date = expires
    links           TEXT                        -- JSON array of other note IDs (A-MEM style)
);

CREATE INDEX IF NOT EXISTS idx_semantic_vertical    ON semantic_notes(vertical);
CREATE INDEX IF NOT EXISTS idx_semantic_category    ON semantic_notes(category);
CREATE INDEX IF NOT EXISTS idx_semantic_importance  ON semantic_notes(importance);
CREATE INDEX IF NOT EXISTS idx_semantic_valid_until ON semantic_notes(valid_until);

-- ============================================================
-- PROCEDURAL MEMORY — reusable skill templates
-- ============================================================
CREATE TABLE IF NOT EXISTS skills (
    id              TEXT PRIMARY KEY,
    description     TEXT NOT NULL,              -- natural language description (indexed by embedding)
    code_template   TEXT NOT NULL,              -- the actual code with {{param}} placeholders
    parameters      TEXT,                       -- JSON schema for parameters
    success_count   INTEGER DEFAULT 0,
    fail_count      INTEGER DEFAULT 0,
    last_used       TEXT,
    source_episodes TEXT,                       -- JSON array of episodes that contributed
    valid_verticals TEXT,                       -- JSON array of verticals where this skill applies
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    status          TEXT DEFAULT 'active'       -- active | quarantined | deprecated
);

CREATE INDEX IF NOT EXISTS idx_skills_status         ON skills(status);
CREATE INDEX IF NOT EXISTS idx_skills_success_count  ON skills(success_count);
CREATE INDEX IF NOT EXISTS idx_skills_last_used      ON skills(last_used);

-- ============================================================
-- NEGATIVE KNOWLEDGE — anti-patterns to avoid
-- ============================================================
CREATE TABLE IF NOT EXISTS anti_patterns (
    id              TEXT PRIMARY KEY,
    description     TEXT NOT NULL,              -- "Don't do X because Y"
    failure_mode    TEXT,                       -- which criterion it fails: C7, C11, S1, ...
    occurrences     TEXT,                       -- JSON array of {episode_id, criterion_id, timestamp}
    occurrence_count INTEGER DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen       TEXT NOT NULL DEFAULT (datetime('now')),
    status          TEXT DEFAULT 'active'       -- active | resolved
);

CREATE INDEX IF NOT EXISTS idx_anti_patterns_status        ON anti_patterns(status);
CREATE INDEX IF NOT EXISTS idx_anti_patterns_failure_mode  ON anti_patterns(failure_mode);
CREATE INDEX IF NOT EXISTS idx_anti_patterns_last_seen     ON anti_patterns(last_seen);

-- ============================================================
-- CODE HASHES — deduplication table for episodic memory
-- ============================================================
-- Stores content-addressable code snippets. Multiple episodes can
-- reference the same hash if they generate the same file.
CREATE TABLE IF NOT EXISTS code_hashes (
    hash            TEXT PRIMARY KEY,           -- sha256 of content
    content         TEXT NOT NULL,              -- full code content
    first_seen      TEXT NOT NULL DEFAULT (datetime('now')),
    reference_count INTEGER DEFAULT 0           -- incremented by save_episode() on each reference
);

CREATE INDEX IF NOT EXISTS idx_code_hashes_reference_count ON code_hashes(reference_count);

-- ============================================================
-- CONSOLIDATION LOG — track sleep/consolidation runs
-- ============================================================
CREATE TABLE IF NOT EXISTS consolidation_runs (
    id              TEXT PRIMARY KEY,
    started_at      TEXT NOT NULL,
    finished_at     TEXT,
    episodes_processed INTEGER DEFAULT 0,
    patterns_extracted INTEGER DEFAULT 0,
    skills_promoted    INTEGER DEFAULT 0,
    anti_patterns_added INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'running'      -- running | completed | failed
);

-- ============================================================
-- MIGRATION TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    version         TEXT PRIMARY KEY,
    applied_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO schema_migrations (version) VALUES ('0.1.0');
