CREATE TABLE devices (
    jid TEXT PRIMARY KEY,
    registration_id INTEGER,
    noise_key BYTEA,
    identity_key BYTEA,
    adv_key BYTEA,
    adv_data BYTEA,
    adv_account_sig BYTEA,
    adv_device_sig BYTEA,
    platform TEXT,
    push_name TEXT,
    last_seen_ts BIGINT,
    fb_user_id BIGINT,
    fb_cat_id TEXT,
    fb_token TEXT,
    fb_token_ts BIGINT,
    backup_token_enc_salt BYTEA,
    backup_token_enc_key BYTEA,
    business_name TEXT
);

CREATE TABLE signed_pre_keys (
    key_id INTEGER PRIMARY KEY,
    key_pair BYTEA,
    signature BYTEA,
    last_updated_ts BIGINT
);

CREATE TABLE sessions (
    session_jid TEXT,
    session_id INTEGER,
    session_record BYTEA,
    PRIMARY KEY (session_jid, session_id)
);

CREATE TABLE identities (
    recipient_id INTEGER,
    device_id INTEGER,
    identity_key BYTEA,
    PRIMARY KEY (recipient_id, device_id)
);

CREATE TABLE sender_keys (
    group_id TEXT,
    sender_jid TEXT,
    sender_key_state BYTEA,
    PRIMARY KEY (group_id, sender_jid)
);

CREATE TABLE app_state_keys (
    key_id TEXT PRIMARY KEY,
    key_data BYTEA
);

CREATE TABLE app_state_version (
    name TEXT PRIMARY KEY,
    version BIGINT,
    hash BYTEA
);

CREATE TABLE app_state_mutations (
    name TEXT,
    "index" BYTEA,
    "value" BYTEA,
    PRIMARY KEY (name, "index")
);

CREATE TABLE contacts (
    jid TEXT PRIMARY KEY,
    first_name TEXT,
    full_name TEXT,
    push_name TEXT,
    business_name TEXT,
    is_blocked BOOLEAN
);

CREATE TABLE chat_settings (
    jid TEXT PRIMARY KEY,
    archived BOOLEAN,
    muted_until BIGINT,
    pinned BOOLEAN,
    pinned_ts BIGINT
);

CREATE TABLE privacy_tokens (
    "timestamp" TIMESTAMPTZ PRIMARY KEY,
    payload BYTEA
);
