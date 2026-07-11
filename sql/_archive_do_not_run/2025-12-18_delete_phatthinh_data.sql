-- Delete Phat Thinh data (missing prices)
DELETE FROM external_parts WHERE source_url LIKE '%phatthinh.vn%';
