-- Create storage buckets and RLS policies

-- ============================================================================
-- Bucket 1: Lease Documents
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lease-documents',
  'lease-documents',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for lease-documents
CREATE POLICY "Users can upload their lease documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'lease-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their lease documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'lease-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their lease documents"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'lease-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their lease documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'lease-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- Bucket 2: Maintenance Photos
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-photos',
  'maintenance-photos',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for maintenance-photos
CREATE POLICY "Users can upload maintenance photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'maintenance-photos'
    AND (
      -- Tenants can upload for their requests
      EXISTS (
        SELECT 1 FROM public.app_25a44123a6_maintenance_requests mr
        WHERE mr.id::text = (storage.foldername(name))[2]
        AND mr.tenant_id = auth.uid()
      )
      OR
      -- Landlords/agents can upload for their properties
      EXISTS (
        SELECT 1 FROM public.app_25a44123a6_maintenance_requests mr
        JOIN public.properties p ON mr.property_id = p.id
        WHERE mr.id::text = (storage.foldername(name))[2]
        AND (p.owner_id = auth.uid() OR p.agent_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can view maintenance photos for their requests"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'maintenance-photos'
    AND (
      EXISTS (
        SELECT 1 FROM public.app_25a44123a6_maintenance_requests mr
        WHERE mr.id::text = (storage.foldername(name))[2]
        AND mr.tenant_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.app_25a44123a6_maintenance_requests mr
        JOIN public.properties p ON mr.property_id = p.id
        WHERE mr.id::text = (storage.foldername(name))[2]
        AND (p.owner_id = auth.uid() OR p.agent_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can delete their maintenance photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'maintenance-photos'
    AND (
      EXISTS (
        SELECT 1 FROM public.app_25a44123a6_maintenance_requests mr
        WHERE mr.id::text = (storage.foldername(name))[2]
        AND mr.tenant_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.app_25a44123a6_maintenance_requests mr
        JOIN public.properties p ON mr.property_id = p.id
        WHERE mr.id::text = (storage.foldername(name))[2]
        AND (p.owner_id = auth.uid() OR p.agent_id = auth.uid())
      )
    )
  );

-- ============================================================================
-- Bucket 3: Payment Receipts
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-receipts',
  'payment-receipts',
  false,
  2097152, -- 2MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for payment-receipts
CREATE POLICY "System can upload payment receipts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'payment-receipts');

CREATE POLICY "Users can view their payment receipts"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'payment-receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- Bucket 4: Property Images
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true, -- Public bucket for property listings
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for property-images
CREATE POLICY "Anyone can view property images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'property-images');

CREATE POLICY "Property owners can upload images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[1]
      AND (p.owner_id = auth.uid() OR p.agent_id = auth.uid())
    )
  );

CREATE POLICY "Property owners can delete images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'property-images'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[1]
      AND (p.owner_id = auth.uid() OR p.agent_id = auth.uid())
    )
  );

-- Add comments
COMMENT ON COLUMN storage.buckets.id IS 'Unique identifier for the storage bucket';
COMMENT ON COLUMN storage.buckets.public IS 'Whether the bucket allows public access';
COMMENT ON COLUMN storage.buckets.file_size_limit IS 'Maximum file size in bytes';
COMMENT ON COLUMN storage.buckets.allowed_mime_types IS 'Array of allowed MIME types';