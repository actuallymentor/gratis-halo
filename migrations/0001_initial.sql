PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    oura_user_id TEXT,
    email TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS users_oura_user_id_unique
    ON users ( oura_user_id )
    WHERE oura_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
    ON users ( lower( email ) )
    WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS oura_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users ( id ) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    access_token_expires_at TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    granted_scopes TEXT,
    needs_reauth INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS oura_connections_user_unique
    ON oura_connections ( user_id );

CREATE TABLE IF NOT EXISTS oura_sleep_nights (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users ( id ) ON DELETE CASCADE,
    oura_sleep_id TEXT NOT NULL,
    day TEXT NOT NULL,
    type TEXT NOT NULL,
    bedtime_start TEXT,
    bedtime_end TEXT,
    time_in_bed_seconds INTEGER,
    average_hrv_ms REAL,
    max_sleep_hrv_ms REAL,
    max_hrv_filter_quality TEXT,
    hrv_sample_interval_seconds INTEGER,
    hrv_sample_start TEXT,
    hrv_items_json TEXT,
    sleep_phase_5_min TEXT,
    sleep_algorithm_version TEXT,
    synced_at TEXT NOT NULL,
    UNIQUE ( user_id, oura_sleep_id )
);

CREATE INDEX IF NOT EXISTS oura_sleep_nights_user_day
    ON oura_sleep_nights ( user_id, day );

CREATE TABLE IF NOT EXISTS pvt_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users ( id ) ON DELETE CASCADE,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL,
    invalidated_reason TEXT,
    duration_seconds INTEGER NOT NULL,
    device_category TEXT,
    input_type TEXT,
    user_agent TEXT,
    viewport_width INTEGER,
    viewport_height INTEGER,
    wake_lock_supported INTEGER,
    wake_lock_active INTEGER,
    score INTEGER,
    mean_rt_ms REAL,
    median_rt_ms REAL,
    rt_stddev_ms REAL,
    lapses_355_ms INTEGER,
    lapses_500_ms INTEGER,
    false_starts INTEGER,
    mean_response_speed REAL
);

CREATE INDEX IF NOT EXISTS pvt_sessions_user_completed
    ON pvt_sessions ( user_id, completed_at );

CREATE TABLE IF NOT EXISTS pvt_trials (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES pvt_sessions ( id ) ON DELETE CASCADE,
    trial_index INTEGER NOT NULL,
    planned_stimulus_at_ms REAL,
    actual_stimulus_at_ms REAL,
    response_at_ms REAL,
    reaction_time_ms REAL,
    valid_response INTEGER NOT NULL,
    false_start INTEGER NOT NULL,
    lapse_355_ms INTEGER NOT NULL,
    lapse_500_ms INTEGER NOT NULL,
    UNIQUE ( session_id, trial_index )
);

CREATE TABLE IF NOT EXISTS sync_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users ( id ) ON DELETE CASCADE,
    source TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL,
    records_seen INTEGER NOT NULL DEFAULT 0,
    records_written INTEGER NOT NULL DEFAULT 0,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS sync_events_user_started
    ON sync_events ( user_id, started_at );

CREATE TABLE IF NOT EXISTS invite_attempts (
    id TEXT PRIMARY KEY,
    ip_hash TEXT NOT NULL,
    attempted_at TEXT NOT NULL,
    success INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS invite_attempts_ip_attempted
    ON invite_attempts ( ip_hash, attempted_at );
