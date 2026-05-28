UPDATE storage.buckets
   SET file_size_limit    = 5242880,
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
 WHERE id = 'book-images';

UPDATE storage.buckets
   SET file_size_limit    = 2097152,
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
 WHERE id = 'avatars';