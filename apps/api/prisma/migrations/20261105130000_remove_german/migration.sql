-- The German course was removed: drop its content (words go with their groups via ON DELETE CASCADE).
DELETE FROM "WordGroup" WHERE "language" = 'de';
