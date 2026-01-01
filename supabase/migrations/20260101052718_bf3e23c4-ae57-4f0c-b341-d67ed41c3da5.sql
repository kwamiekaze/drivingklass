-- Create media_uploads table for admin video/media management
CREATE TABLE public.media_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.media_uploads ENABLE ROW LEVEL SECURITY;

-- Anyone can view media
CREATE POLICY "Anyone can view media" 
ON public.media_uploads 
FOR SELECT 
USING (true);

-- Only admins can insert media
CREATE POLICY "Admins can insert media" 
ON public.media_uploads 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update media
CREATE POLICY "Admins can update media" 
ON public.media_uploads 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete media
CREATE POLICY "Admins can delete media" 
ON public.media_uploads 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('media', 'media', true, 104857600)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for media bucket
CREATE POLICY "Anyone can view media files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'media');

CREATE POLICY "Admins can upload media files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'media' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update media files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'media' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete media files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'media' AND has_role(auth.uid(), 'admin'::app_role));