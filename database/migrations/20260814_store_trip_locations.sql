BEGIN;

SET LOCAL search_path TO nomad_diary, public;

ALTER TABLE places
    ADD COLUMN IF NOT EXISTS ward_code varchar(50),
    ADD COLUMN IF NOT EXISTS catalog_place_id varchar(64),
    ALTER COLUMN latitude DROP NOT NULL,
    ALTER COLUMN longitude DROP NOT NULL;

DROP INDEX IF EXISTS uk_places_province_slug_active;
DROP INDEX IF EXISTS uk_places_province_ward_slug_active;

CREATE UNIQUE INDEX IF NOT EXISTS uk_places_catalog_active
    ON places (catalog_place_id)
    WHERE is_deleted = false
      AND catalog_place_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_places_custom_ward_slug_active
    ON places (province_id, ward_code, slug)
    WHERE is_deleted = false
      AND catalog_place_id IS NULL
      AND ward_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_places_province_ward
    ON places (province_id, ward_code)
    WHERE is_deleted = false;

COMMIT;
