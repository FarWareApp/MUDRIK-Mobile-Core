export const migrationV9Presence = `
  CREATE TABLE IF NOT EXISTS trusted_surfaces (
    surface_id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    kind TEXT NOT NULL
      CHECK (
        kind IN (
          'phone',
          'tablet',
          'web',
          'desktop',
          'smart_display',
          'television',
          'headset',
          'vehicle_display',
          'ar',
          'vr',
          'spatial_display'
        )
      ),
    privacy_class TEXT NOT NULL
      CHECK (
        privacy_class IN (
          'personal_private',
          'personal_shared_space',
          'household_shared',
          'public_or_untrusted'
        )
      ),
    capabilities_json TEXT NOT NULL,
    shared_space INTEGER NOT NULL
      CHECK (shared_space IN (0, 1)),
    revision INTEGER NOT NULL
      CHECK (revision >= 1),
    approved_at INTEGER NOT NULL
      CHECK (approved_at >= 0),
    state TEXT NOT NULL
      CHECK (state IN ('active', 'revoked')),
    CHECK (
      privacy_class != 'personal_private'
      OR shared_space = 0
    ),
    CHECK (
      privacy_class != 'public_or_untrusted'
      OR shared_space = 1
    )
  );

  CREATE INDEX IF NOT EXISTS
    idx_trusted_surfaces_account_state
  ON trusted_surfaces(
    account_id,
    state,
    surface_id
  );

  CREATE TABLE IF NOT EXISTS primary_surface_leases (
    presence_session_id TEXT PRIMARY KEY NOT NULL,
    surface_id TEXT NOT NULL,
    generation INTEGER NOT NULL
      CHECK (generation >= 0),
    issued_at INTEGER NOT NULL
      CHECK (issued_at >= 0),
    expires_at INTEGER NOT NULL,
    privacy_state TEXT NOT NULL
      CHECK (
        privacy_state IN (
          'active',
          'visual_off',
          'ambient_off',
          'privacy_lock'
        )
      ),
    CHECK (expires_at > issued_at),
    CHECK (expires_at - issued_at <= 60000),
    FOREIGN KEY (surface_id)
      REFERENCES trusted_surfaces(surface_id)
      ON DELETE RESTRICT
  );

  CREATE INDEX IF NOT EXISTS
    idx_primary_surface_leases_expiry
  ON primary_surface_leases(expires_at ASC);
`;
