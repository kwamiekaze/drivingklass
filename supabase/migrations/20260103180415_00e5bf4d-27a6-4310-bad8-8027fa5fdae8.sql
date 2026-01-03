-- First migration: Add new enum values only
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'instructor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';