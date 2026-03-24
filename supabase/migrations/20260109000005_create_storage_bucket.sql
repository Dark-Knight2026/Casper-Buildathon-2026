-- Create storage bucket for listing photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-photos',
  'listing-photos',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for listing photos storage
DROP POLICY IF EXISTS "Public can view listing photos" ON storage.objects;
CREATE POLICY "Public can view listing photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'listing-photos');

DROP POLICY IF EXISTS "Authenticated users can upload listing photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload listing photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own listing photos" ON storage.objects;
CREATE POLICY "Users can update their own listing photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listing-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own listing photos" ON storage.objects;
CREATE POLICY "Users can delete their own listing photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create storage bucket for listing documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-documents',
  'listing-documents',
  false, -- Private bucket
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for listing documents
DROP POLICY IF EXISTS "Users can view their own listing documents" ON storage.objects;
CREATE POLICY "Users can view their own listing documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'listing-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can upload their own listing documents" ON storage.objects;
CREATE POLICY "Users can upload their own listing documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own listing documents" ON storage.objects;
CREATE POLICY "Users can update their own listing documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listing-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own listing documents" ON storage.objects;
CREATE POLICY "Users can delete their own listing documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );