-- Add UPDATE policy for contact_submissions so admins can update status
CREATE POLICY "Admins can update submissions"
ON public.contact_submissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Also allow staff to view submissions
CREATE POLICY "Staff can view submissions"
ON public.contact_submissions
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role));