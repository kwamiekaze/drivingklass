-- Add staff role to the existing policy for viewing ID files
-- First drop the existing admin-only policy
DROP POLICY IF EXISTS "Admins can view ID files" ON storage.objects;

-- Create a new policy that allows both admin and staff to view ID files
CREATE POLICY "Admin and staff can view ID files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'id-uploads' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
);