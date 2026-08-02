-- =============================================================
-- NOMAD DIARY - DUMMY SEED DATA
-- PostgreSQL
-- Generated for schema: nomad_diary
-- WARNING: This script truncates existing data in the schema tables.
-- =============================================================

BEGIN;
SET search_path TO nomad_diary, public;

TRUNCATE TABLE
    auth_sessions,
    place_tags,
    trip_tags,
    images,
    place_reviews,
    trip_stops,
    trips,
    places,
    provinces,
    tags,
    users
RESTART IDENTITY CASCADE;

-- USERS
INSERT INTO users (
    id, username, email, password_hash, display_name, avatar_url, bio,
    is_deleted, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES
(1, 'luong', 'luong@example.com', '$2b$12$demo.hash.only.not.for.production', 'Lương Trọng', 'https://example.com/assets/avatar/luong.jpg', 'Ghi lại những chuyến đi, những nơi đáng nhớ và những nơi không nên quay lại.',
 FALSE, now(), now());

-- PROVINCES
INSERT INTO provinces (
    id, country_code, code, name, slug,
    center_latitude, center_longitude,
    is_deleted, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES
(1, 'VN', '01', 'Hà Nội', 'ha-noi', 21.0285, 105.8542, FALSE, now(), now()),
(2, 'VN', '48', 'Đà Nẵng', 'da-nang', 16.0544, 108.2022, FALSE, now(), now()),
(3, 'VN', '68', 'Lâm Đồng', 'lam-dong', 11.9404, 108.4583, FALSE, now(), now()),
(4, 'VN', '79', 'Thành phố Hồ Chí Minh', 'ho-chi-minh', 10.8231, 106.6297, FALSE, now(), now()),
(5, 'VN', '02', 'Hà Giang', 'ha-giang', 22.8026, 104.9784, FALSE, now(), now()),
(6, 'VN', '91', 'Kiên Giang', 'kien-giang', 10.0125, 105.0809, FALSE, now(), now()),
(7, 'VN', '22', 'Quảng Ninh', 'quang-ninh', 21.0064, 107.2925, FALSE, now(), now()),
(8, 'VN', '38', 'Thanh Hóa', 'thanh-hoa', 19.8067, 105.7852, FALSE, now(), now()),
(9, 'VN', '11', 'Điện Biên', 'dien-bien', 21.386, 103.023, FALSE, now(), now()),
(10, 'VN', '14', 'Sơn La', 'son-la', 21.327, 103.9141, FALSE, now(), now());

-- PLACES
INSERT INTO places (
    id, province_id, name, slug, description,
    district, ward, address,
    latitude, longitude,
    website_url, map_url,
    is_deleted, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES
(1, 3, 'Hồ Xuân Hương', 'ho-xuan-huong', 'Hồ trung tâm Đà Lạt, thích hợp đi bộ sáng sớm.', 'Đà Lạt', 'Phường 1', 'Trung tâm Đà Lạt', 11.9433, 108.4453, NULL, NULL, FALSE, now(), now()),
(2, 3, 'Đồi chè Cầu Đất', 'doi-che-cau-dat', 'Đồi chè rộng, đẹp nhất vào sáng sớm.', 'Đà Lạt', 'Xuân Trường', 'Cầu Đất, Xuân Trường', 11.8858, 108.738, NULL, NULL, FALSE, now(), now()),
(3, 3, 'Núi Langbiang', 'nui-langbiang', 'Điểm ngắm toàn cảnh cao nguyên.', 'Lạc Dương', 'Lát', 'Thị trấn Lạc Dương', 12.05, 108.437, NULL, NULL, FALSE, now(), now()),
(4, 3, 'Chợ Đà Lạt', 'cho-da-lat', 'Chợ trung tâm và khu ẩm thực đêm.', 'Đà Lạt', 'Phường 1', 'Nguyễn Thị Minh Khai', 11.942, 108.4369, NULL, NULL, FALSE, now(), now()),
(5, 3, 'Hồ Tuyền Lâm', 'ho-tuyen-lam', 'Hồ nước yên tĩnh phía nam Đà Lạt.', 'Đà Lạt', 'Phường 4', 'Khu du lịch Hồ Tuyền Lâm', 11.9036, 108.4318, NULL, NULL, FALSE, now(), now()),
(6, 2, 'Cầu Rồng', 'cau-rong', 'Cây cầu biểu tượng của Đà Nẵng.', 'Hải Châu', 'An Hải Tây', 'Nguyễn Văn Linh', 16.0611, 108.2276, NULL, NULL, FALSE, now(), now()),
(7, 2, 'Bãi biển Mỹ Khê', 'bai-bien-my-khe', 'Bãi biển dài, thuận tiện tắm sáng.', 'Sơn Trà', 'Phước Mỹ', 'Võ Nguyên Giáp', 16.061, 108.246, NULL, NULL, FALSE, now(), now()),
(8, 2, 'Bà Nà Hills', 'ba-na-hills', 'Khu du lịch trên núi, thường đông khách.', 'Hòa Vang', 'Hòa Ninh', 'An Sơn', 15.9953, 107.9969, NULL, NULL, FALSE, now(), now()),
(9, 2, 'Bán đảo Sơn Trà', 'ban-dao-son-tra', 'Cung đường ven biển và rừng tự nhiên.', 'Sơn Trà', 'Thọ Quang', 'Sơn Trà', 16.1199, 108.277, NULL, NULL, FALSE, now(), now()),
(10, 5, 'Đèo Mã Pí Lèng', 'deo-ma-pi-leng', 'Một trong những cung đèo đẹp nhất miền Bắc.', 'Mèo Vạc', NULL, 'Quốc lộ 4C', 23.2361, 105.4032, NULL, NULL, FALSE, now(), now()),
(11, 5, 'Cột cờ Lũng Cú', 'cot-co-lung-cu', 'Điểm cực Bắc nổi tiếng.', 'Đồng Văn', 'Lũng Cú', 'Lũng Cú', 23.363, 105.3135, NULL, NULL, FALSE, now(), now()),
(12, 5, 'Phố cổ Đồng Văn', 'pho-co-dong-van', 'Khu phố cổ nhỏ, có chợ phiên cuối tuần.', 'Đồng Văn', 'Đồng Văn', 'Trung tâm Đồng Văn', 23.2786, 105.3625, NULL, NULL, FALSE, now(), now()),
(13, 6, 'Bãi Sao Phú Quốc', 'bai-sao-phu-quoc', 'Bãi cát trắng ở phía nam đảo.', 'Phú Quốc', 'An Thới', 'Bãi Sao', 10.0574, 104.0363, NULL, NULL, FALSE, now(), now()),
(14, 6, 'Hòn Thơm', 'hon-thom', 'Đảo nhỏ phía nam Phú Quốc.', 'Phú Quốc', 'Hòn Thơm', 'Hòn Thơm', 9.9537, 104.0127, NULL, NULL, FALSE, now(), now()),
(15, 6, 'Grand World Phú Quốc', 'grand-world-phu-quoc', 'Khu vui chơi và phố đi bộ.', 'Phú Quốc', 'Gành Dầu', 'Bãi Dài', 10.3378, 103.849, NULL, NULL, FALSE, now(), now()),
(16, 7, 'Vịnh Hạ Long', 'vinh-ha-long', 'Di sản thiên nhiên với nhiều đảo đá.', 'Hạ Long', 'Bãi Cháy', 'Vịnh Hạ Long', 20.9101, 107.1839, NULL, NULL, FALSE, now(), now()),
(17, 7, 'Bảo tàng Quảng Ninh', 'bao-tang-quang-ninh', 'Bảo tàng có kiến trúc hiện đại.', 'Hạ Long', 'Hồng Hải', 'Trần Quốc Nghiễn', 20.9505, 107.0899, NULL, NULL, FALSE, now(), now()),
(18, 1, 'Hồ Hoàn Kiếm', 'ho-hoan-kiem', 'Điểm đi bộ trung tâm Hà Nội.', 'Hoàn Kiếm', 'Hàng Trống', 'Hồ Hoàn Kiếm', 21.0287, 105.8522, NULL, NULL, FALSE, now(), now()),
(19, 1, 'Văn Miếu - Quốc Tử Giám', 'van-mieu-quoc-tu-giam', 'Di tích lịch sử và giáo dục.', 'Đống Đa', 'Văn Miếu', '58 Quốc Tử Giám', 21.0275, 105.8355, NULL, NULL, FALSE, now(), now()),
(20, 1, 'Phố cổ Hà Nội', 'pho-co-ha-noi', 'Khu phố cũ với nhiều món ăn đường phố.', 'Hoàn Kiếm', 'Hàng Bạc', 'Khu phố cổ', 21.034, 105.85, NULL, NULL, FALSE, now(), now()),
(21, 8, 'Pù Luông', 'pu-luong', 'Ruộng bậc thang và bản làng miền núi.', 'Bá Thước', 'Thành Lâm', 'Khu bảo tồn Pù Luông', 20.478, 105.188, NULL, NULL, FALSE, now(), now()),
(22, 9, 'Đèo Pha Đin', 'deo-pha-din', 'Cung đèo nối Sơn La và Điện Biên.', 'Tuần Giáo', NULL, 'Quốc lộ 6', 21.5737, 103.5094, NULL, NULL, FALSE, now(), now()),
(23, 10, 'Mộc Châu', 'moc-chau', 'Cao nguyên nổi tiếng với đồi chè và mùa hoa.', 'Mộc Châu', NULL, 'Cao nguyên Mộc Châu', 20.8294, 104.684, NULL, NULL, FALSE, now(), now()),
(24, 4, 'Bến Bạch Đằng', 'ben-bach-dang', 'Không gian ven sông ở trung tâm thành phố.', 'Quận 1', 'Bến Nghé', 'Tôn Đức Thắng', 10.7755, 106.7069, NULL, NULL, FALSE, now(), now());

-- TRIPS
INSERT INTO trips (
    id, user_id, title, slug, description, thumbnail_url,
    status, start_date, end_date, is_public,
    is_deleted, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES
(1, 1, 'Đà Lạt mùa mưa 2024', 'da-lat-mua-mua-2024', 'Chuyến đi ngắn để nghỉ ngơi và thử các quán cà phê mới.', 'https://example.com/images/trips/da-lat-2024-cover.jpg', 3, '2024-07-12'::date, '2024-07-15'::date, TRUE, FALSE, now(), now()),
(2, 1, 'Đà Nẵng - Hội An 2025', 'da-nang-hoi-an-2025', 'Biển, bán đảo Sơn Trà và một ngày ở Bà Nà.', 'https://example.com/images/trips/da-nang-2025-cover.jpg', 3, '2025-04-28'::date, '2025-05-02'::date, TRUE, FALSE, now(), now()),
(3, 1, 'Hà Giang mùa tam giác mạch', 'ha-giang-tam-giac-mach-2025', 'Road trip qua Đồng Văn, Mèo Vạc và Lũng Cú.', 'https://example.com/images/trips/ha-giang-2025-cover.jpg', 3, '2025-10-20'::date, '2025-10-25'::date, TRUE, FALSE, now(), now()),
(4, 1, 'Trở lại Đà Lạt 2026', 'tro-lai-da-lat-2026', 'Quay lại một số điểm cũ và khám phá thêm Cầu Đất.', 'https://example.com/images/trips/da-lat-2026-cover.jpg', 3, '2026-03-08'::date, '2026-03-11'::date, TRUE, FALSE, now(), now()),
(5, 1, 'Phú Quốc nghỉ dưỡng', 'phu-quoc-nghi-duong-2026', 'Chuyến đi biển với lịch trình nhẹ.', 'https://example.com/images/trips/phu-quoc-2026-cover.jpg', 3, '2026-06-10'::date, '2026-06-14'::date, TRUE, FALSE, now(), now()),
(6, 1, 'Tây Bắc mùa lúa chín', 'tay-bac-mua-lua-chin', 'Kế hoạch đi Mộc Châu, Pha Đin và Điện Biên.', 'https://example.com/images/trips/tay-bac-cover.jpg', 1, '2026-09-15'::date, '2026-09-21'::date, FALSE, FALSE, now(), now());

-- TRIP STOPS
INSERT INTO trip_stops (
    id, trip_id, place_id, visit_order,
    arrived_at, departed_at, title, note,
    is_deleted, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES
(1, 1, 1, 1, '2024-07-12 07:00:00+07'::timestamptz, '2024-07-12 09:00:00+07'::timestamptz, 'Đi bộ quanh hồ', 'Trời se lạnh, khá yên tĩnh.', FALSE, now(), now()),
(2, 1, 4, 2, '2024-07-12 19:00:00+07'::timestamptz, '2024-07-12 21:30:00+07'::timestamptz, 'Ăn tối ở chợ', 'Đông nhưng nhiều món.', FALSE, now(), now()),
(3, 1, 3, 3, '2024-07-13 08:30:00+07'::timestamptz, '2024-07-13 13:00:00+07'::timestamptz, 'Langbiang', 'View đẹp nhưng khu dịch vụ hơi ồn.', FALSE, now(), now()),
(4, 1, 5, 4, '2024-07-14 06:30:00+07'::timestamptz, '2024-07-14 10:00:00+07'::timestamptz, 'Sáng ở Tuyền Lâm', 'Không khí tốt, nên quay lại.', FALSE, now(), now()),
(5, 2, 6, 1, '2025-04-28 20:30:00+07'::timestamptz, '2025-04-28 22:00:00+07'::timestamptz, 'Xem cầu phun lửa', 'Nên đến tối cuối tuần.', FALSE, now(), now()),
(6, 2, 7, 2, '2025-04-29 05:30:00+07'::timestamptz, '2025-04-29 08:00:00+07'::timestamptz, 'Tắm biển sáng', 'Biển sạch, ít đông lúc sáng sớm.', FALSE, now(), now()),
(7, 2, 9, 3, '2025-04-30 07:00:00+07'::timestamptz, '2025-04-30 12:00:00+07'::timestamptz, 'Chạy xe Sơn Trà', 'Cung đường đẹp, cần đi chậm.', FALSE, now(), now()),
(8, 2, 8, 4, '2025-05-01 08:00:00+07'::timestamptz, '2025-05-01 17:00:00+07'::timestamptz, 'Một ngày ở Bà Nà', 'Quá đông dịp lễ.', FALSE, now(), now()),
(9, 3, 12, 1, '2025-10-20 16:00:00+07'::timestamptz, '2025-10-21 07:00:00+07'::timestamptz, 'Đêm Đồng Văn', 'Không khí dễ chịu.', FALSE, now(), now()),
(10, 3, 11, 2, '2025-10-21 08:30:00+07'::timestamptz, '2025-10-21 11:00:00+07'::timestamptz, 'Lũng Cú', 'Đường đi đẹp.', FALSE, now(), now()),
(11, 3, 10, 3, '2025-10-22 09:00:00+07'::timestamptz, '2025-10-22 13:00:00+07'::timestamptz, 'Mã Pí Lèng', 'Cảnh rất ấn tượng.', FALSE, now(), now()),
(12, 3, 12, 4, '2025-10-23 17:00:00+07'::timestamptz, '2025-10-24 06:30:00+07'::timestamptz, 'Quay lại Đồng Văn', 'Lần ghé thứ hai trong cùng chuyến.', FALSE, now(), now()),
(13, 4, 1, 1, '2026-03-08 06:30:00+07'::timestamptz, '2026-03-08 08:00:00+07'::timestamptz, 'Hồ Xuân Hương lần hai', 'Đông hơn lần trước.', FALSE, now(), now()),
(14, 4, 2, 2, '2026-03-09 05:00:00+07'::timestamptz, '2026-03-09 10:30:00+07'::timestamptz, 'Săn mây Cầu Đất', 'Đáng đi, nên đến sớm.', FALSE, now(), now()),
(15, 4, 3, 3, '2026-03-10 09:00:00+07'::timestamptz, '2026-03-10 12:30:00+07'::timestamptz, 'Langbiang lần hai', 'Dịch vụ không cải thiện.', FALSE, now(), now()),
(16, 4, 4, 4, '2026-03-10 18:30:00+07'::timestamptz, '2026-03-10 20:00:00+07'::timestamptz, 'Chợ Đà Lạt lần hai', 'Quá đông và khó gửi xe.', FALSE, now(), now()),
(17, 4, 5, 5, '2026-03-11 07:00:00+07'::timestamptz, '2026-03-11 09:30:00+07'::timestamptz, 'Tuyền Lâm lần hai', 'Vẫn là nơi thích nhất.', FALSE, now(), now()),
(18, 5, 13, 1, '2026-06-10 14:00:00+07'::timestamptz, '2026-06-10 18:00:00+07'::timestamptz, 'Chiều ở Bãi Sao', 'Nước đẹp nhưng dịch vụ đắt.', FALSE, now(), now()),
(19, 5, 14, 2, '2026-06-11 08:00:00+07'::timestamptz, '2026-06-11 16:00:00+07'::timestamptz, 'Hòn Thơm', 'Cáp treo thú vị.', FALSE, now(), now()),
(20, 5, 15, 3, '2026-06-12 18:00:00+07'::timestamptz, '2026-06-12 22:00:00+07'::timestamptz, 'Grand World', 'Đẹp để chụp ảnh, hơi thương mại.', FALSE, now(), now()),
(21, 5, 13, 4, '2026-06-13 06:00:00+07'::timestamptz, '2026-06-13 09:00:00+07'::timestamptz, 'Quay lại Bãi Sao', 'Sáng sớm yên tĩnh hơn.', FALSE, now(), now()),
(22, 6, 23, 1, '2026-09-15 09:00:00+07'::timestamptz, '2026-09-16 08:00:00+07'::timestamptz, 'Mộc Châu', 'Điểm dự kiến.', FALSE, now(), now()),
(23, 6, 22, 2, '2026-09-17 10:00:00+07'::timestamptz, '2026-09-17 13:00:00+07'::timestamptz, 'Đèo Pha Đin', 'Điểm dự kiến.', FALSE, now(), now()),
(24, 6, 21, 3, '2026-09-19 08:00:00+07'::timestamptz, '2026-09-20 08:00:00+07'::timestamptz, 'Pù Luông', 'Điểm dự kiến.', FALSE, now(), now());

-- PLACE REVIEWS
INSERT INTO place_reviews (
    id, trip_stop_id, rating, revisit_status,
    is_favorite, note, warning_note,
    is_deleted, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES
(1, 1, 5, 1, TRUE, 'Rất thích không khí sáng sớm.', NULL, FALSE, now(), now()),
(2, 2, 3, 2, FALSE, 'Nhiều món nhưng khá đông.', 'Tránh khung giờ 19:00–21:00 cuối tuần.', FALSE, now(), now()),
(3, 3, 3, 2, FALSE, 'View đẹp nhưng trải nghiệm dịch vụ trung bình.', NULL, FALSE, now(), now()),
(4, 4, 5, 1, TRUE, 'Yên tĩnh, phù hợp nghỉ ngơi.', NULL, FALSE, now(), now()),
(5, 5, 4, 1, FALSE, 'Nên xem ít nhất một lần.', NULL, FALSE, now(), now()),
(6, 6, 5, 1, TRUE, 'Biển đẹp nhất vào sáng sớm.', NULL, FALSE, now(), now()),
(7, 7, 5, 1, TRUE, 'Cung đường rất đáng đi.', 'Cẩn thận khỉ và các đoạn cua.', FALSE, now(), now()),
(8, 8, 2, 3, FALSE, 'Quá đông, xếp hàng lâu.', 'Không nên đi dịp lễ hoặc cuối tuần cao điểm.', FALSE, now(), now()),
(9, 9, 4, 1, TRUE, 'Thích không khí thị trấn về đêm.', NULL, FALSE, now(), now()),
(10, 10, 4, 1, FALSE, 'Đáng ghé nếu đi Hà Giang.', NULL, FALSE, now(), now()),
(11, 11, 5, 1, TRUE, 'Một trong những điểm đẹp nhất chuyến đi.', 'Đường đèo nguy hiểm khi sương mù.', FALSE, now(), now()),
(12, 12, 4, 1, TRUE, 'Quay lại vẫn thấy dễ chịu.', NULL, FALSE, now(), now()),
(13, 13, 3, 2, FALSE, 'Đẹp nhưng đông hơn lần trước.', 'Nên đi trước 06:30.', FALSE, now(), now()),
(14, 14, 5, 1, TRUE, 'Rất đáng quay lại.', 'Nên kiểm tra thời tiết trước khi săn mây.', FALSE, now(), now()),
(15, 15, 2, 3, FALSE, 'Không còn phù hợp sở thích.', 'Đã đi hai lần, không ưu tiên quay lại.', FALSE, now(), now()),
(16, 16, 2, 3, FALSE, 'Quá đông, gửi xe khó.', 'Không nên thêm vào trip mới nếu chỉ để ăn tối.', FALSE, now(), now()),
(17, 17, 5, 1, TRUE, 'Vẫn rất yên tĩnh.', NULL, FALSE, now(), now()),
(18, 18, 4, 2, FALSE, 'Cảnh đẹp nhưng giá dịch vụ cao.', NULL, FALSE, now(), now()),
(19, 19, 4, 1, TRUE, 'Có thể quay lại cùng gia đình.', NULL, FALSE, now(), now()),
(20, 20, 3, 2, FALSE, 'Chụp ảnh đẹp, trải nghiệm thương mại.', NULL, FALSE, now(), now()),
(21, 21, 5, 1, TRUE, 'Sáng sớm rất đẹp và ít người.', NULL, FALSE, now(), now());

-- TAGS
INSERT INTO tags (
    id, name, slug, description,
    is_deleted, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES
(1, 'Thiên nhiên', 'thien-nhien', 'Cảnh quan tự nhiên', FALSE, now(), now()),
(2, 'Biển', 'bien', 'Bãi biển và đảo', FALSE, now(), now()),
(3, 'Núi', 'nui', 'Đồi núi và cung đèo', FALSE, now(), now()),
(4, 'Ẩm thực', 'am-thuc', 'Ăn uống và chợ', FALSE, now(), now()),
(5, 'Chụp ảnh', 'chup-anh', 'Phù hợp chụp ảnh', FALSE, now(), now()),
(6, 'Yên tĩnh', 'yen-tinh', 'Không gian thư giãn', FALSE, now(), now()),
(7, 'Đông người', 'dong-nguoi', 'Thường đông vào giờ cao điểm', FALSE, now(), now()),
(8, 'Road trip', 'road-trip', 'Phù hợp hành trình đường dài', FALSE, now(), now()),
(9, 'Gia đình', 'gia-dinh', 'Phù hợp đi cùng gia đình', FALSE, now(), now()),
(10, 'Nghỉ dưỡng', 'nghi-duong', 'Lịch trình nhẹ và nghỉ ngơi', FALSE, now(), now());

-- TRIP TAGS
INSERT INTO trip_tags (trip_id, tag_id, created_at) VALUES
(1, 1, now()),
(1, 6, now()),
(1, 10, now()),
(2, 2, now()),
(2, 5, now()),
(2, 9, now()),
(3, 1, now()),
(3, 3, now()),
(3, 8, now()),
(4, 1, now()),
(4, 5, now()),
(4, 10, now()),
(5, 2, now()),
(5, 9, now()),
(5, 10, now()),
(6, 1, now()),
(6, 3, now()),
(6, 8, now());

-- PLACE TAGS
INSERT INTO place_tags (place_id, tag_id, created_at) VALUES
(1, 1, now()),
(1, 6, now()),
(1, 5, now()),
(2, 1, now()),
(2, 5, now()),
(2, 6, now()),
(3, 3, now()),
(3, 1, now()),
(3, 7, now()),
(4, 4, now()),
(4, 7, now()),
(5, 1, now()),
(5, 6, now()),
(6, 5, now()),
(6, 7, now()),
(7, 2, now()),
(7, 6, now()),
(8, 5, now()),
(8, 7, now()),
(8, 9, now()),
(9, 1, now()),
(9, 3, now()),
(9, 8, now()),
(10, 1, now()),
(10, 3, now()),
(10, 8, now()),
(10, 5, now()),
(11, 1, now()),
(11, 3, now()),
(11, 5, now()),
(12, 4, now()),
(12, 5, now()),
(12, 6, now()),
(13, 2, now()),
(13, 5, now()),
(13, 6, now()),
(14, 2, now()),
(14, 5, now()),
(14, 9, now()),
(15, 5, now()),
(15, 7, now()),
(15, 9, now()),
(16, 1, now()),
(16, 5, now()),
(16, 9, now()),
(18, 5, now()),
(18, 6, now()),
(21, 1, now()),
(21, 3, now()),
(21, 6, now()),
(22, 3, now()),
(22, 8, now()),
(23, 1, now()),
(23, 3, now()),
(23, 8, now());

-- IMAGES
INSERT INTO images (
    id, trip_id, trip_stop_id,
    image_url, thumbnail_url, original_filename, description,
    captured_at, latitude, longitude,
    width, height, file_size, mime_type, sort_order,
    is_cover, is_favorite, ai_tags,
    is_deleted, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES
(1, 1, 1, 'https://example.com/images/trips/1/stops/1/photo-01.jpg', 'https://example.com/images/trips/1/stops/1/thumb-01.jpg', 'trip-1-stop-1-01.jpg', 'Đi bộ quanh hồ - ảnh 1', '2024-07-12 07:00:00+07'::timestamptz, 11.9433, 108.4453, 4032, 3024, 2933912, 'image/jpeg', 1, TRUE, TRUE, '[{"name": "lake", "confidence": 0.91}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(2, 1, 1, 'https://example.com/images/trips/1/stops/1/photo-02.jpg', 'https://example.com/images/trips/1/stops/1/thumb-02.jpg', 'trip-1-stop-1-02.jpg', 'Đi bộ quanh hồ - ảnh 2', '2024-07-12 07:00:00+07'::timestamptz, 11.9433, 108.4453, 4032, 3024, 2209805, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "lake", "confidence": 0.91}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(3, 1, 1, 'https://example.com/images/trips/1/stops/1/photo-03.jpg', 'https://example.com/images/trips/1/stops/1/thumb-03.jpg', 'trip-1-stop-1-03.jpg', 'Đi bộ quanh hồ - ảnh 3', '2024-07-12 07:00:00+07'::timestamptz, 11.9433, 108.4453, 4032, 3024, 4307113, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "lake", "confidence": 0.91}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(4, 1, 2, 'https://example.com/images/trips/1/stops/2/photo-01.jpg', 'https://example.com/images/trips/1/stops/2/thumb-01.jpg', 'trip-1-stop-2-01.jpg', 'Ăn tối ở chợ - ảnh 1', '2024-07-12 19:00:00+07'::timestamptz, 11.942, 108.4369, 4032, 3024, 4054301, 'image/jpeg', 1, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(5, 1, 2, 'https://example.com/images/trips/1/stops/2/photo-02.jpg', 'https://example.com/images/trips/1/stops/2/thumb-02.jpg', 'trip-1-stop-2-02.jpg', 'Ăn tối ở chợ - ảnh 2', '2024-07-12 19:00:00+07'::timestamptz, 11.942, 108.4369, 4032, 3024, 3872427, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(6, 1, 2, 'https://example.com/images/trips/1/stops/2/photo-03.jpg', 'https://example.com/images/trips/1/stops/2/thumb-03.jpg', 'trip-1-stop-2-03.jpg', 'Ăn tối ở chợ - ảnh 3', '2024-07-12 19:00:00+07'::timestamptz, 11.942, 108.4369, 4032, 3024, 3170528, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(7, 1, 3, 'https://example.com/images/trips/1/stops/3/photo-01.jpg', 'https://example.com/images/trips/1/stops/3/thumb-01.jpg', 'trip-1-stop-3-01.jpg', 'Langbiang - ảnh 1', '2024-07-13 08:30:00+07'::timestamptz, 12.05, 108.437, 4032, 3024, 2859791, 'image/jpeg', 1, FALSE, FALSE, '[{"name": "mountain", "confidence": 0.94}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(8, 1, 3, 'https://example.com/images/trips/1/stops/3/photo-02.jpg', 'https://example.com/images/trips/1/stops/3/thumb-02.jpg', 'trip-1-stop-3-02.jpg', 'Langbiang - ảnh 2', '2024-07-13 08:30:00+07'::timestamptz, 12.05, 108.437, 4032, 3024, 6574866, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "mountain", "confidence": 0.94}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(9, 1, 3, 'https://example.com/images/trips/1/stops/3/photo-03.jpg', 'https://example.com/images/trips/1/stops/3/thumb-03.jpg', 'trip-1-stop-3-03.jpg', 'Langbiang - ảnh 3', '2024-07-13 08:30:00+07'::timestamptz, 12.05, 108.437, 4032, 3024, 2729295, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "mountain", "confidence": 0.94}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(10, 1, 4, 'https://example.com/images/trips/1/stops/4/photo-01.jpg', 'https://example.com/images/trips/1/stops/4/thumb-01.jpg', 'trip-1-stop-4-01.jpg', 'Sáng ở Tuyền Lâm - ảnh 1', '2024-07-14 06:30:00+07'::timestamptz, 11.9036, 108.4318, 4032, 3024, 6953410, 'image/jpeg', 1, FALSE, TRUE, '[{"name": "lake", "confidence": 0.91}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(11, 1, 4, 'https://example.com/images/trips/1/stops/4/photo-02.jpg', 'https://example.com/images/trips/1/stops/4/thumb-02.jpg', 'trip-1-stop-4-02.jpg', 'Sáng ở Tuyền Lâm - ảnh 2', '2024-07-14 06:30:00+07'::timestamptz, 11.9036, 108.4318, 4032, 3024, 5539336, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "lake", "confidence": 0.91}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(12, 1, 4, 'https://example.com/images/trips/1/stops/4/photo-03.jpg', 'https://example.com/images/trips/1/stops/4/thumb-03.jpg', 'trip-1-stop-4-03.jpg', 'Sáng ở Tuyền Lâm - ảnh 3', '2024-07-14 06:30:00+07'::timestamptz, 11.9036, 108.4318, 4032, 3024, 2266612, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "lake", "confidence": 0.91}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(13, 2, 5, 'https://example.com/images/trips/2/stops/5/photo-01.jpg', 'https://example.com/images/trips/2/stops/5/thumb-01.jpg', 'trip-2-stop-5-01.jpg', 'Xem cầu phun lửa - ảnh 1', '2025-04-28 20:30:00+07'::timestamptz, 16.0611, 108.2276, 4032, 3024, 2249957, 'image/jpeg', 1, TRUE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(14, 2, 5, 'https://example.com/images/trips/2/stops/5/photo-02.jpg', 'https://example.com/images/trips/2/stops/5/thumb-02.jpg', 'trip-2-stop-5-02.jpg', 'Xem cầu phun lửa - ảnh 2', '2025-04-28 20:30:00+07'::timestamptz, 16.0611, 108.2276, 4032, 3024, 2785972, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(15, 2, 5, 'https://example.com/images/trips/2/stops/5/photo-03.jpg', 'https://example.com/images/trips/2/stops/5/thumb-03.jpg', 'trip-2-stop-5-03.jpg', 'Xem cầu phun lửa - ảnh 3', '2025-04-28 20:30:00+07'::timestamptz, 16.0611, 108.2276, 4032, 3024, 3834068, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(16, 2, 6, 'https://example.com/images/trips/2/stops/6/photo-01.jpg', 'https://example.com/images/trips/2/stops/6/thumb-01.jpg', 'trip-2-stop-6-01.jpg', 'Tắm biển sáng - ảnh 1', '2025-04-29 05:30:00+07'::timestamptz, 16.061, 108.246, 4032, 3024, 3951701, 'image/jpeg', 1, FALSE, TRUE, '[{"name": "beach", "confidence": 0.96}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(17, 2, 6, 'https://example.com/images/trips/2/stops/6/photo-02.jpg', 'https://example.com/images/trips/2/stops/6/thumb-02.jpg', 'trip-2-stop-6-02.jpg', 'Tắm biển sáng - ảnh 2', '2025-04-29 05:30:00+07'::timestamptz, 16.061, 108.246, 4032, 3024, 6239227, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "beach", "confidence": 0.96}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(18, 2, 6, 'https://example.com/images/trips/2/stops/6/photo-03.jpg', 'https://example.com/images/trips/2/stops/6/thumb-03.jpg', 'trip-2-stop-6-03.jpg', 'Tắm biển sáng - ảnh 3', '2025-04-29 05:30:00+07'::timestamptz, 16.061, 108.246, 4032, 3024, 2222599, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "beach", "confidence": 0.96}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(19, 2, 7, 'https://example.com/images/trips/2/stops/7/photo-01.jpg', 'https://example.com/images/trips/2/stops/7/thumb-01.jpg', 'trip-2-stop-7-01.jpg', 'Chạy xe Sơn Trà - ảnh 1', '2025-04-30 07:00:00+07'::timestamptz, 16.1199, 108.277, 4032, 3024, 6708064, 'image/jpeg', 1, FALSE, TRUE, '[{"name": "mountain", "confidence": 0.94}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(20, 2, 7, 'https://example.com/images/trips/2/stops/7/photo-02.jpg', 'https://example.com/images/trips/2/stops/7/thumb-02.jpg', 'trip-2-stop-7-02.jpg', 'Chạy xe Sơn Trà - ảnh 2', '2025-04-30 07:00:00+07'::timestamptz, 16.1199, 108.277, 4032, 3024, 3667971, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "mountain", "confidence": 0.94}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(21, 2, 7, 'https://example.com/images/trips/2/stops/7/photo-03.jpg', 'https://example.com/images/trips/2/stops/7/thumb-03.jpg', 'trip-2-stop-7-03.jpg', 'Chạy xe Sơn Trà - ảnh 3', '2025-04-30 07:00:00+07'::timestamptz, 16.1199, 108.277, 4032, 3024, 6571300, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "mountain", "confidence": 0.94}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(22, 2, 8, 'https://example.com/images/trips/2/stops/8/photo-01.jpg', 'https://example.com/images/trips/2/stops/8/thumb-01.jpg', 'trip-2-stop-8-01.jpg', 'Một ngày ở Bà Nà - ảnh 1', '2025-05-01 08:00:00+07'::timestamptz, 15.9953, 107.9969, 4032, 3024, 5519187, 'image/jpeg', 1, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(23, 2, 8, 'https://example.com/images/trips/2/stops/8/photo-02.jpg', 'https://example.com/images/trips/2/stops/8/thumb-02.jpg', 'trip-2-stop-8-02.jpg', 'Một ngày ở Bà Nà - ảnh 2', '2025-05-01 08:00:00+07'::timestamptz, 15.9953, 107.9969, 4032, 3024, 3849189, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(24, 3, 9, 'https://example.com/images/trips/3/stops/9/photo-01.jpg', 'https://example.com/images/trips/3/stops/9/thumb-01.jpg', 'trip-3-stop-9-01.jpg', 'Đêm Đồng Văn - ảnh 1', '2025-10-20 16:00:00+07'::timestamptz, 23.2786, 105.3625, 4032, 3024, 5768238, 'image/jpeg', 1, TRUE, TRUE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(25, 3, 9, 'https://example.com/images/trips/3/stops/9/photo-02.jpg', 'https://example.com/images/trips/3/stops/9/thumb-02.jpg', 'trip-3-stop-9-02.jpg', 'Đêm Đồng Văn - ảnh 2', '2025-10-20 16:00:00+07'::timestamptz, 23.2786, 105.3625, 4032, 3024, 6943118, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(26, 3, 9, 'https://example.com/images/trips/3/stops/9/photo-03.jpg', 'https://example.com/images/trips/3/stops/9/thumb-03.jpg', 'trip-3-stop-9-03.jpg', 'Đêm Đồng Văn - ảnh 3', '2025-10-20 16:00:00+07'::timestamptz, 23.2786, 105.3625, 4032, 3024, 4333632, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(27, 3, 10, 'https://example.com/images/trips/3/stops/10/photo-01.jpg', 'https://example.com/images/trips/3/stops/10/thumb-01.jpg', 'trip-3-stop-10-01.jpg', 'Lũng Cú - ảnh 1', '2025-10-21 08:30:00+07'::timestamptz, 23.363, 105.3135, 4032, 3024, 2054515, 'image/jpeg', 1, FALSE, FALSE, '[{"name": "mountain", "confidence": 0.94}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(28, 3, 10, 'https://example.com/images/trips/3/stops/10/photo-02.jpg', 'https://example.com/images/trips/3/stops/10/thumb-02.jpg', 'trip-3-stop-10-02.jpg', 'Lũng Cú - ảnh 2', '2025-10-21 08:30:00+07'::timestamptz, 23.363, 105.3135, 4032, 3024, 3339319, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "mountain", "confidence": 0.94}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(29, 3, 10, 'https://example.com/images/trips/3/stops/10/photo-03.jpg', 'https://example.com/images/trips/3/stops/10/thumb-03.jpg', 'trip-3-stop-10-03.jpg', 'Lũng Cú - ảnh 3', '2025-10-21 08:30:00+07'::timestamptz, 23.363, 105.3135, 4032, 3024, 5545146, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "mountain", "confidence": 0.94}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(30, 3, 11, 'https://example.com/images/trips/3/stops/11/photo-01.jpg', 'https://example.com/images/trips/3/stops/11/thumb-01.jpg', 'trip-3-stop-11-01.jpg', 'Mã Pí Lèng - ảnh 1', '2025-10-22 09:00:00+07'::timestamptz, 23.2361, 105.4032, 4032, 3024, 4854228, 'image/jpeg', 1, FALSE, TRUE, '[{"name": "mountain", "confidence": 0.94}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(31, 3, 11, 'https://example.com/images/trips/3/stops/11/photo-02.jpg', 'https://example.com/images/trips/3/stops/11/thumb-02.jpg', 'trip-3-stop-11-02.jpg', 'Mã Pí Lèng - ảnh 2', '2025-10-22 09:00:00+07'::timestamptz, 23.2361, 105.4032, 4032, 3024, 4330953, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "mountain", "confidence": 0.94}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(32, 3, 11, 'https://example.com/images/trips/3/stops/11/photo-03.jpg', 'https://example.com/images/trips/3/stops/11/thumb-03.jpg', 'trip-3-stop-11-03.jpg', 'Mã Pí Lèng - ảnh 3', '2025-10-22 09:00:00+07'::timestamptz, 23.2361, 105.4032, 4032, 3024, 3304256, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "mountain", "confidence": 0.94}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(33, 3, 12, 'https://example.com/images/trips/3/stops/12/photo-01.jpg', 'https://example.com/images/trips/3/stops/12/thumb-01.jpg', 'trip-3-stop-12-01.jpg', 'Quay lại Đồng Văn - ảnh 1', '2025-10-23 17:00:00+07'::timestamptz, 23.2786, 105.3625, 4032, 3024, 3806182, 'image/jpeg', 1, FALSE, TRUE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(34, 3, 12, 'https://example.com/images/trips/3/stops/12/photo-02.jpg', 'https://example.com/images/trips/3/stops/12/thumb-02.jpg', 'trip-3-stop-12-02.jpg', 'Quay lại Đồng Văn - ảnh 2', '2025-10-23 17:00:00+07'::timestamptz, 23.2786, 105.3625, 4032, 3024, 4823559, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(35, 3, 12, 'https://example.com/images/trips/3/stops/12/photo-03.jpg', 'https://example.com/images/trips/3/stops/12/thumb-03.jpg', 'trip-3-stop-12-03.jpg', 'Quay lại Đồng Văn - ảnh 3', '2025-10-23 17:00:00+07'::timestamptz, 23.2786, 105.3625, 4032, 3024, 2857401, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(36, 4, 13, 'https://example.com/images/trips/4/stops/13/photo-01.jpg', 'https://example.com/images/trips/4/stops/13/thumb-01.jpg', 'trip-4-stop-13-01.jpg', 'Hồ Xuân Hương lần hai - ảnh 1', '2026-03-08 06:30:00+07'::timestamptz, 11.9433, 108.4453, 4032, 3024, 2778008, 'image/jpeg', 1, TRUE, FALSE, '[{"name": "lake", "confidence": 0.91}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(37, 4, 13, 'https://example.com/images/trips/4/stops/13/photo-02.jpg', 'https://example.com/images/trips/4/stops/13/thumb-02.jpg', 'trip-4-stop-13-02.jpg', 'Hồ Xuân Hương lần hai - ảnh 2', '2026-03-08 06:30:00+07'::timestamptz, 11.9433, 108.4453, 4032, 3024, 5187061, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "lake", "confidence": 0.91}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(38, 4, 13, 'https://example.com/images/trips/4/stops/13/photo-03.jpg', 'https://example.com/images/trips/4/stops/13/thumb-03.jpg', 'trip-4-stop-13-03.jpg', 'Hồ Xuân Hương lần hai - ảnh 3', '2026-03-08 06:30:00+07'::timestamptz, 11.9433, 108.4453, 4032, 3024, 2811315, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "lake", "confidence": 0.91}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(39, 4, 14, 'https://example.com/images/trips/4/stops/14/photo-01.jpg', 'https://example.com/images/trips/4/stops/14/thumb-01.jpg', 'trip-4-stop-14-01.jpg', 'Săn mây Cầu Đất - ảnh 1', '2026-03-09 05:00:00+07'::timestamptz, 11.8858, 108.738, 4032, 3024, 5011337, 'image/jpeg', 1, FALSE, TRUE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(40, 4, 14, 'https://example.com/images/trips/4/stops/14/photo-02.jpg', 'https://example.com/images/trips/4/stops/14/thumb-02.jpg', 'trip-4-stop-14-02.jpg', 'Săn mây Cầu Đất - ảnh 2', '2026-03-09 05:00:00+07'::timestamptz, 11.8858, 108.738, 4032, 3024, 4885309, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(41, 4, 14, 'https://example.com/images/trips/4/stops/14/photo-03.jpg', 'https://example.com/images/trips/4/stops/14/thumb-03.jpg', 'trip-4-stop-14-03.jpg', 'Săn mây Cầu Đất - ảnh 3', '2026-03-09 05:00:00+07'::timestamptz, 11.8858, 108.738, 4032, 3024, 4218961, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(42, 4, 15, 'https://example.com/images/trips/4/stops/15/photo-01.jpg', 'https://example.com/images/trips/4/stops/15/thumb-01.jpg', 'trip-4-stop-15-01.jpg', 'Langbiang lần hai - ảnh 1', '2026-03-10 09:00:00+07'::timestamptz, 12.05, 108.437, 4032, 3024, 2364488, 'image/jpeg', 1, FALSE, FALSE, '[{"name": "mountain", "confidence": 0.94}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(43, 4, 15, 'https://example.com/images/trips/4/stops/15/photo-02.jpg', 'https://example.com/images/trips/4/stops/15/thumb-02.jpg', 'trip-4-stop-15-02.jpg', 'Langbiang lần hai - ảnh 2', '2026-03-10 09:00:00+07'::timestamptz, 12.05, 108.437, 4032, 3024, 5853935, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "mountain", "confidence": 0.94}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(44, 4, 16, 'https://example.com/images/trips/4/stops/16/photo-01.jpg', 'https://example.com/images/trips/4/stops/16/thumb-01.jpg', 'trip-4-stop-16-01.jpg', 'Chợ Đà Lạt lần hai - ảnh 1', '2026-03-10 18:30:00+07'::timestamptz, 11.942, 108.4369, 4032, 3024, 6498207, 'image/jpeg', 1, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(45, 4, 16, 'https://example.com/images/trips/4/stops/16/photo-02.jpg', 'https://example.com/images/trips/4/stops/16/thumb-02.jpg', 'trip-4-stop-16-02.jpg', 'Chợ Đà Lạt lần hai - ảnh 2', '2026-03-10 18:30:00+07'::timestamptz, 11.942, 108.4369, 4032, 3024, 3047117, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(46, 4, 17, 'https://example.com/images/trips/4/stops/17/photo-01.jpg', 'https://example.com/images/trips/4/stops/17/thumb-01.jpg', 'trip-4-stop-17-01.jpg', 'Tuyền Lâm lần hai - ảnh 1', '2026-03-11 07:00:00+07'::timestamptz, 11.9036, 108.4318, 4032, 3024, 5175376, 'image/jpeg', 1, FALSE, TRUE, '[{"name": "lake", "confidence": 0.91}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(47, 4, 17, 'https://example.com/images/trips/4/stops/17/photo-02.jpg', 'https://example.com/images/trips/4/stops/17/thumb-02.jpg', 'trip-4-stop-17-02.jpg', 'Tuyền Lâm lần hai - ảnh 2', '2026-03-11 07:00:00+07'::timestamptz, 11.9036, 108.4318, 4032, 3024, 2661023, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "lake", "confidence": 0.91}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(48, 4, 17, 'https://example.com/images/trips/4/stops/17/photo-03.jpg', 'https://example.com/images/trips/4/stops/17/thumb-03.jpg', 'trip-4-stop-17-03.jpg', 'Tuyền Lâm lần hai - ảnh 3', '2026-03-11 07:00:00+07'::timestamptz, 11.9036, 108.4318, 4032, 3024, 6630852, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "lake", "confidence": 0.91}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(49, 5, 18, 'https://example.com/images/trips/5/stops/18/photo-01.jpg', 'https://example.com/images/trips/5/stops/18/thumb-01.jpg', 'trip-5-stop-18-01.jpg', 'Chiều ở Bãi Sao - ảnh 1', '2026-06-10 14:00:00+07'::timestamptz, 10.0574, 104.0363, 4032, 3024, 4459357, 'image/jpeg', 1, TRUE, FALSE, '[{"name": "beach", "confidence": 0.96}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(50, 5, 18, 'https://example.com/images/trips/5/stops/18/photo-02.jpg', 'https://example.com/images/trips/5/stops/18/thumb-02.jpg', 'trip-5-stop-18-02.jpg', 'Chiều ở Bãi Sao - ảnh 2', '2026-06-10 14:00:00+07'::timestamptz, 10.0574, 104.0363, 4032, 3024, 5033614, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "beach", "confidence": 0.96}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(51, 5, 18, 'https://example.com/images/trips/5/stops/18/photo-03.jpg', 'https://example.com/images/trips/5/stops/18/thumb-03.jpg', 'trip-5-stop-18-03.jpg', 'Chiều ở Bãi Sao - ảnh 3', '2026-06-10 14:00:00+07'::timestamptz, 10.0574, 104.0363, 4032, 3024, 6843180, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "beach", "confidence": 0.96}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(52, 5, 19, 'https://example.com/images/trips/5/stops/19/photo-01.jpg', 'https://example.com/images/trips/5/stops/19/thumb-01.jpg', 'trip-5-stop-19-01.jpg', 'Hòn Thơm - ảnh 1', '2026-06-11 08:00:00+07'::timestamptz, 9.9537, 104.0127, 4032, 3024, 3613033, 'image/jpeg', 1, FALSE, TRUE, '[{"name": "beach", "confidence": 0.96}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(53, 5, 19, 'https://example.com/images/trips/5/stops/19/photo-02.jpg', 'https://example.com/images/trips/5/stops/19/thumb-02.jpg', 'trip-5-stop-19-02.jpg', 'Hòn Thơm - ảnh 2', '2026-06-11 08:00:00+07'::timestamptz, 9.9537, 104.0127, 4032, 3024, 2583470, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "beach", "confidence": 0.96}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(54, 5, 19, 'https://example.com/images/trips/5/stops/19/photo-03.jpg', 'https://example.com/images/trips/5/stops/19/thumb-03.jpg', 'trip-5-stop-19-03.jpg', 'Hòn Thơm - ảnh 3', '2026-06-11 08:00:00+07'::timestamptz, 9.9537, 104.0127, 4032, 3024, 2384402, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "beach", "confidence": 0.96}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(55, 5, 20, 'https://example.com/images/trips/5/stops/20/photo-01.jpg', 'https://example.com/images/trips/5/stops/20/thumb-01.jpg', 'trip-5-stop-20-01.jpg', 'Grand World - ảnh 1', '2026-06-12 18:00:00+07'::timestamptz, 10.3378, 103.849, 4032, 3024, 3911749, 'image/jpeg', 1, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(56, 5, 20, 'https://example.com/images/trips/5/stops/20/photo-02.jpg', 'https://example.com/images/trips/5/stops/20/thumb-02.jpg', 'trip-5-stop-20-02.jpg', 'Grand World - ảnh 2', '2026-06-12 18:00:00+07'::timestamptz, 10.3378, 103.849, 4032, 3024, 4427562, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(57, 5, 21, 'https://example.com/images/trips/5/stops/21/photo-01.jpg', 'https://example.com/images/trips/5/stops/21/thumb-01.jpg', 'trip-5-stop-21-01.jpg', 'Quay lại Bãi Sao - ảnh 1', '2026-06-13 06:00:00+07'::timestamptz, 10.0574, 104.0363, 4032, 3024, 2669343, 'image/jpeg', 1, FALSE, TRUE, '[{"name": "beach", "confidence": 0.96}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(58, 5, 21, 'https://example.com/images/trips/5/stops/21/photo-02.jpg', 'https://example.com/images/trips/5/stops/21/thumb-02.jpg', 'trip-5-stop-21-02.jpg', 'Quay lại Bãi Sao - ảnh 2', '2026-06-13 06:00:00+07'::timestamptz, 10.0574, 104.0363, 4032, 3024, 3952791, 'image/jpeg', 2, FALSE, FALSE, '[{"name": "beach", "confidence": 0.96}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(59, 5, 21, 'https://example.com/images/trips/5/stops/21/photo-03.jpg', 'https://example.com/images/trips/5/stops/21/thumb-03.jpg', 'trip-5-stop-21-03.jpg', 'Quay lại Bãi Sao - ảnh 3', '2026-06-13 06:00:00+07'::timestamptz, 10.0574, 104.0363, 4032, 3024, 2847261, 'image/jpeg', 3, FALSE, FALSE, '[{"name": "beach", "confidence": 0.96}, {"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(60, 1, NULL, 'https://example.com/images/trips/1/trip-overview.jpg', 'https://example.com/images/trips/1/trip-overview-thumb.jpg', 'trip-1-overview.jpg', 'Ảnh tổng quan chuyến đi', NULL, NULL, NULL, 4032, 3024, 5188729, 'image/jpeg', 0, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(61, 2, NULL, 'https://example.com/images/trips/2/trip-overview.jpg', 'https://example.com/images/trips/2/trip-overview-thumb.jpg', 'trip-2-overview.jpg', 'Ảnh tổng quan chuyến đi', NULL, NULL, NULL, 4032, 3024, 4331811, 'image/jpeg', 0, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(62, 3, NULL, 'https://example.com/images/trips/3/trip-overview.jpg', 'https://example.com/images/trips/3/trip-overview-thumb.jpg', 'trip-3-overview.jpg', 'Ảnh tổng quan chuyến đi', NULL, NULL, NULL, 4032, 3024, 5803481, 'image/jpeg', 0, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(63, 4, NULL, 'https://example.com/images/trips/4/trip-overview.jpg', 'https://example.com/images/trips/4/trip-overview-thumb.jpg', 'trip-4-overview.jpg', 'Ảnh tổng quan chuyến đi', NULL, NULL, NULL, 4032, 3024, 5060434, 'image/jpeg', 0, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now()),
(64, 5, NULL, 'https://example.com/images/trips/5/trip-overview.jpg', 'https://example.com/images/trips/5/trip-overview-thumb.jpg', 'trip-5-overview.jpg', 'Ảnh tổng quan chuyến đi', NULL, NULL, NULL, 4032, 3024, 3364441, 'image/jpeg', 0, FALSE, FALSE, '[{"name": "travel", "confidence": 0.99}]'::jsonb, FALSE, now(), now());

SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1), true);
SELECT setval(pg_get_serial_sequence('provinces', 'id'), COALESCE((SELECT MAX(id) FROM provinces), 1), true);
SELECT setval(pg_get_serial_sequence('places', 'id'), COALESCE((SELECT MAX(id) FROM places), 1), true);
SELECT setval(pg_get_serial_sequence('trips', 'id'), COALESCE((SELECT MAX(id) FROM trips), 1), true);
SELECT setval(pg_get_serial_sequence('trip_stops', 'id'), COALESCE((SELECT MAX(id) FROM trip_stops), 1), true);
SELECT setval(pg_get_serial_sequence('place_reviews', 'id'), COALESCE((SELECT MAX(id) FROM place_reviews), 1), true);
SELECT setval(pg_get_serial_sequence('images', 'id'), COALESCE((SELECT MAX(id) FROM images), 1), true);
SELECT setval(pg_get_serial_sequence('tags', 'id'), COALESCE((SELECT MAX(id) FROM tags), 1), true);

-- Quick verification
SELECT
    (SELECT COUNT(*) FROM users) AS users,
    (SELECT COUNT(*) FROM auth_sessions) AS auth_sessions,
    (SELECT COUNT(*) FROM trips) AS trips,
    (SELECT COUNT(*) FROM provinces) AS provinces,
    (SELECT COUNT(*) FROM places) AS places,
    (SELECT COUNT(*) FROM trip_stops) AS trip_stops,
    (SELECT COUNT(*) FROM place_reviews) AS reviews,
    (SELECT COUNT(*) FROM images) AS images,
    (SELECT COUNT(*) FROM tags) AS tags;

COMMIT;

-- Expected highlights:
-- - User 1 owns 6 trips.
-- - No auth sessions are seeded; login and refresh flows create them at runtime.
-- - Hồ Xuân Hương, Langbiang, Chợ Đà Lạt, Hồ Tuyền Lâm are revisited.
-- - Phố cổ Đồng Văn and Bãi Sao are visited twice within the same trip.
-- - Some places are marked NOT_RECOMMENDED (revisit_status = 3).
-- - Images can be filtered by trip, trip_stop, place, and province.

select * from trips where user_id = 1;
