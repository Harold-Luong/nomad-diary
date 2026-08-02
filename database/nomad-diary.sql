-- Active: 1785611912431@@127.0.0.1@5432@nomad_diary@nomad_diary

-- =========================================================
-- NOMAD DIARY - POSTGRESQL DATABASE DESIGN
-- =========================================================
BEGIN;

-- Chỉ reset schema của ứng dụng; không tác động tới các đối tượng khác
-- đang nằm trong schema public.
DROP SCHEMA IF EXISTS nomad_diary CASCADE;
CREATE SCHEMA nomad_diary;
SET search_path TO nomad_diary, public;

-- =========================================================
-- 1. USERS
-- =========================================================

CREATE TABLE users (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username varchar(100) NOT NULL,
    email varchar(255) NOT NULL,
    password_hash varchar(255),
    display_name varchar(255),
    avatar_url text,
    bio text,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Không phân biệt chữ hoa, chữ thường.
CREATE UNIQUE INDEX uk_users_username_active ON users (lower(username))
WHERE
    is_deleted = false;

CREATE UNIQUE INDEX uk_users_email_active ON users (lower(email))
WHERE
    is_deleted = false;

-- =========================================================
-- 2. AUTH SESSIONS
-- Mỗi bản ghi đại diện cho một phiên đăng nhập/refresh token của user.
-- Chỉ lưu hash của refresh token; không lưu token gốc.
-- =========================================================

CREATE TABLE auth_sessions (
    id uuid PRIMARY KEY,
    user_id bigint NOT NULL,
    refresh_token_hash varchar(128) NOT NULL,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    user_agent varchar(1000),
    ip_address varchar(64),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT auth_sessions_expiry_check CHECK (expires_at > created_at),
    CONSTRAINT auth_sessions_revoked_at_check CHECK (
        revoked_at IS NULL
        OR revoked_at >= created_at
    )
);

CREATE INDEX idx_auth_sessions_user_active ON auth_sessions (user_id, expires_at DESC)
WHERE
    revoked_at IS NULL;

CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions (expires_at);

-- =========================================================
-- 3. PROVINCES
-- Tỉnh/thành phố dùng để thống kê và tô polygon trên bản đồ.
--
-- Polygon có thể lưu trong file GeoJSON phía frontend.
-- Bảng này chỉ cần code để liên kết với properties.code
-- trong file GeoJSON.
-- =========================================================

CREATE TABLE provinces (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    country_code varchar(2) NOT NULL DEFAULT 'VN',
    code varchar(50) NOT NULL,
    name varchar(255) NOT NULL,
    slug varchar(255) NOT NULL,
    center_latitude double precision,
    center_longitude double precision,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT provinces_latitude_check CHECK (
        center_latitude IS NULL
        OR center_latitude BETWEEN -90 AND 90
    ),
    CONSTRAINT provinces_longitude_check CHECK (
        center_longitude IS NULL
        OR center_longitude BETWEEN -180 AND 180
    )
);

CREATE UNIQUE INDEX uk_provinces_country_code_active ON provinces (country_code, code)
WHERE
    is_deleted = false;

CREATE UNIQUE INDEX uk_provinces_country_slug_active ON provinces (country_code, slug)
WHERE
    is_deleted = false;

CREATE INDEX idx_provinces_country ON provinces (country_code)
WHERE
    is_deleted = false;

-- =========================================================
-- 4. PLACES
-- Lưu địa điểm dùng chung.
--
-- Ví dụ:
-- Hồ Xuân Hương chỉ có một bản ghi trong places.
-- Trip A và Trip B quay lại nơi này sẽ tạo hai trip_stops.
-- =========================================================

CREATE TABLE places (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    province_id bigint NOT NULL,
    name varchar(255) NOT NULL,
    slug varchar(255) NOT NULL,
    description text,
    district varchar(255),
    ward varchar(255),
    address text,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    website_url text,
    map_url text,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_places_province FOREIGN KEY (province_id) REFERENCES provinces (id) ON DELETE RESTRICT,
    CONSTRAINT places_latitude_check CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT places_longitude_check CHECK (
        longitude BETWEEN -180 AND 180
    )
);

-- Cho phép hai tỉnh có địa điểm cùng slug nhưng trong một tỉnh
-- thì slug của địa điểm đang hoạt động phải duy nhất.
CREATE UNIQUE INDEX uk_places_province_slug_active ON places (province_id, slug)
WHERE
    is_deleted = false;

CREATE INDEX idx_places_province ON places (province_id)
WHERE
    is_deleted = false;

CREATE INDEX idx_places_name ON places (lower(name))
WHERE
    is_deleted = false;

CREATE INDEX idx_places_coordinates ON places (latitude, longitude)
WHERE
    is_deleted = false;

-- =========================================================
-- 5. TRIPS
--
-- status:
-- 0 = draft
-- 1 = planned
-- 2 = ongoing
-- 3 = completed
-- 4 = cancelled
-- =========================================================

CREATE TABLE trips (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL,
    title varchar(255) NOT NULL,
    slug varchar(255) NOT NULL,
    description text,
    thumbnail_url text,
    status smallint NOT NULL DEFAULT 0,
    start_date date,
    end_date date,
    is_public boolean NOT NULL DEFAULT false,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_trips_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT trips_status_check CHECK (status IN (0, 1, 2, 3, 4)),
    CONSTRAINT trips_date_check CHECK (
        end_date IS NULL
        OR start_date IS NULL
        OR end_date >= start_date
    )
);

CREATE UNIQUE INDEX uk_trips_user_slug_active ON trips (user_id, slug)
WHERE
    is_deleted = false;

CREATE INDEX idx_trips_user ON trips (user_id)
WHERE
    is_deleted = false;

CREATE INDEX idx_trips_user_status ON trips (user_id, status)
WHERE
    is_deleted = false;

CREATE INDEX idx_trips_dates ON trips (start_date, end_date)
WHERE
    is_deleted = false;

-- =========================================================
-- 6. TRIP STOPS
--
-- Một trip_stop là một lần ghé place trong một trip.
--
-- Có thể:
-- - Trip A ghé Place X.
-- - Trip B ghé lại Place X.
-- - Cùng Trip A ghé Place X nhiều lần.
-- =========================================================


CREATE TABLE trip_stops (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    trip_id bigint NOT NULL,
    place_id bigint NOT NULL,

    visit_order integer NOT NULL,

    arrived_at timestamptz,
    departed_at timestamptz,

    title varchar(255),
    note text,

    is_deleted boolean NOT NULL DEFAULT false,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT fk_trip_stops_trip
        FOREIGN KEY (trip_id)
        REFERENCES trips(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_trip_stops_place
        FOREIGN KEY (place_id)
        REFERENCES places(id)
        ON DELETE RESTRICT,

    CONSTRAINT trip_stops_visit_order_check
        CHECK (visit_order > 0),

    CONSTRAINT trip_stops_time_check
        CHECK (
            departed_at IS NULL
            OR arrived_at IS NULL
            OR departed_at >= arrived_at
        ),

-- Dùng cho foreign key kết hợp trong bảng images.
CONSTRAINT uk_trip_stops_id_trip UNIQUE (id, trip_id) );

-- Chỉ các điểm dừng chưa bị xóa mới phải duy nhất visit_order.
CREATE UNIQUE INDEX uk_trip_stops_trip_order_active ON trip_stops (trip_id, visit_order)
WHERE
    is_deleted = false;

CREATE INDEX idx_trip_stops_trip ON trip_stops (trip_id)
WHERE
    is_deleted = false;

CREATE INDEX idx_trip_stops_place ON trip_stops (place_id)
WHERE
    is_deleted = false;

CREATE INDEX idx_trip_stops_place_arrived ON trip_stops (place_id, arrived_at DESC)
WHERE
    is_deleted = false;

CREATE INDEX idx_trip_stops_trip_place ON trip_stops (trip_id, place_id)
WHERE
    is_deleted = false;

-- =========================================================
-- 7. PLACE REVIEWS
--
-- Đánh giá thuộc một lần ghé cụ thể.
--
-- revisit_status:
-- 0 = chưa xác định
-- 1 = nên quay lại
-- 2 = cân nhắc
-- 3 = không nên quay lại
--
-- Mỗi trip_stop có tối đa một đánh giá.
-- Người dùng được suy ra từ trip.user_id.
-- =========================================================

CREATE TABLE place_reviews (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trip_stop_id bigint NOT NULL,
    rating smallint,
    revisit_status smallint NOT NULL DEFAULT 0,
    is_favorite boolean NOT NULL DEFAULT false,
    note text,
    warning_note text,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_place_reviews_trip_stop FOREIGN KEY (trip_stop_id) REFERENCES trip_stops (id) ON DELETE CASCADE,
    CONSTRAINT place_reviews_rating_check CHECK (
        rating IS NULL
        OR rating BETWEEN 1 AND 5
    ),
    CONSTRAINT place_reviews_revisit_status_check CHECK (
        revisit_status IN (0, 1, 2, 3)
    )
);

CREATE UNIQUE INDEX uk_place_reviews_trip_stop_active ON place_reviews (trip_stop_id)
WHERE
    is_deleted = false;

CREATE INDEX idx_place_reviews_revisit_status ON place_reviews (revisit_status)
WHERE
    is_deleted = false;

CREATE INDEX idx_place_reviews_favorite ON place_reviews (trip_stop_id)
WHERE
    is_favorite = true
    AND is_deleted = false;

-- =========================================================
-- 8. IMAGES
--
-- trip_id bắt buộc:
-- Ảnh luôn thuộc một chuyến đi.
--
-- trip_stop_id nullable:
-- - NULL: ảnh chung của chuyến đi.
-- - Có giá trị: ảnh tại một điểm dừng cụ thể.
--
-- Foreign key kết hợp bảo đảm trip_stop thuộc đúng trip.
-- =========================================================

CREATE TABLE images (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trip_id bigint NOT NULL,
    trip_stop_id bigint,
    image_url text NOT NULL,
    thumbnail_url text,
    original_filename varchar(500),
    description text,
    captured_at timestamptz,
    latitude double precision,
    longitude double precision,
    width integer,
    height integer,
    file_size bigint,
    mime_type varchar(100),
    sort_order integer NOT NULL DEFAULT 0,
    is_cover boolean NOT NULL DEFAULT false,
    is_favorite boolean NOT NULL DEFAULT false,
    ai_tags jsonb,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_images_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_images_trip_stop_trip FOREIGN KEY (trip_stop_id, trip_id) REFERENCES trip_stops (id, trip_id) ON DELETE CASCADE,
    CONSTRAINT images_latitude_check CHECK (
        latitude IS NULL
        OR latitude BETWEEN -90 AND 90
    ),
    CONSTRAINT images_longitude_check CHECK (
        longitude IS NULL
        OR longitude BETWEEN -180 AND 180
    ),
    CONSTRAINT images_width_check CHECK (
        width IS NULL
        OR width > 0
    ),
    CONSTRAINT images_height_check CHECK (
        height IS NULL
        OR height > 0
    ),
    CONSTRAINT images_file_size_check CHECK (
        file_size IS NULL
        OR file_size >= 0
    ),
    CONSTRAINT images_sort_order_check CHECK (sort_order >= 0)
);

CREATE INDEX idx_images_trip ON images (trip_id)
WHERE
    is_deleted = false;

CREATE INDEX idx_images_trip_stop ON images (trip_stop_id)
WHERE
    trip_stop_id IS NOT NULL
    AND is_deleted = false;

CREATE INDEX idx_images_captured_at ON images (captured_at DESC)
WHERE
    is_deleted = false;

CREATE INDEX idx_images_trip_captured ON images (trip_id, captured_at DESC)
WHERE
    is_deleted = false;

CREATE INDEX idx_images_favorite ON images (trip_id)
WHERE
    is_favorite = true
    AND is_deleted = false;

CREATE INDEX idx_images_ai_tags ON images USING gin (ai_tags);

-- Mỗi chuyến chỉ có tối đa một ảnh cover đang hoạt động.
CREATE UNIQUE INDEX uk_images_trip_cover_active ON images (trip_id)
WHERE
    is_cover = true
    AND is_deleted = false;

-- =========================================================
-- 9. TAGS
-- =========================================================

CREATE TABLE tags (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name varchar(100) NOT NULL,
    slug varchar(100) NOT NULL,
    description text,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uk_tags_slug_active ON tags (slug)
WHERE
    is_deleted = false;

CREATE UNIQUE INDEX uk_tags_name_active ON tags (lower(name))
WHERE
    is_deleted = false;

-- =========================================================
-- 10. TRIP TAGS
-- Một chuyến có nhiều tag, một tag thuộc nhiều chuyến.
-- =========================================================

CREATE TABLE trip_tags (
    trip_id bigint NOT NULL,
    tag_id bigint NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (trip_id, tag_id),
    CONSTRAINT fk_trip_tags_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_trip_tags_tag FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
);

CREATE INDEX idx_trip_tags_tag ON trip_tags (tag_id);

-- =========================================================
-- 11. PLACE TAGS
-- Một địa điểm có nhiều tag, một tag thuộc nhiều địa điểm.
-- =========================================================

CREATE TABLE place_tags (
    place_id bigint NOT NULL,
    tag_id bigint NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (place_id, tag_id),
    CONSTRAINT fk_place_tags_place FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE,
    CONSTRAINT fk_place_tags_tag FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
);

CREATE INDEX idx_place_tags_tag ON place_tags (tag_id);

-- =========================================================
-- 12. AUTO UPDATE updated_at
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_provinces_updated_at
BEFORE UPDATE ON provinces
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_places_updated_at
BEFORE UPDATE ON places
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_trips_updated_at
BEFORE UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_trip_stops_updated_at
BEFORE UPDATE ON trip_stops
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_place_reviews_updated_at
BEFORE UPDATE ON place_reviews
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_images_updated_at
BEFORE UPDATE ON images
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tags_updated_at
BEFORE UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
