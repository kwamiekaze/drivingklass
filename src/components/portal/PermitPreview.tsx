import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, FileText, AlertCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface PermitPreviewProps {
  permitFileUrl: string | null | undefined;
  className?: string;
}

/**
 * Robust permit photo preview component that handles:
 * - New uploads (data URLs)
 * - Existing storage paths (generates signed URLs)
 * - Full URLs (uses directly or generates signed URL)
 * - PDF files (shows view button)
 * - Loading states and error fallbacks
 */
export function PermitPreview({ permitFileUrl, className }: PermitPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!permitFileUrl) {
      setPreviewUrl(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if it's a data URL (newly selected file)
      if (permitFileUrl.startsWith('data:')) {
        setPreviewUrl(permitFileUrl);
        setIsPdf(permitFileUrl.includes('application/pdf'));
        setIsLoading(false);
        return;
      }

      // Check if it's a PDF
      const lowerUrl = permitFileUrl.toLowerCase();
      const isPdfFile = lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf');
      setIsPdf(isPdfFile);

      // If it's a full URL (http/https), try to use it directly
      if (permitFileUrl.startsWith('http://') || permitFileUrl.startsWith('https://')) {
        // Check if it's a Supabase storage URL that might need a signed URL
        if (permitFileUrl.includes('supabase') && permitFileUrl.includes('/storage/')) {
          // Extract the path from the URL
          const urlMatch = permitFileUrl.match(/\/permits\/(.+)$/);
          if (urlMatch) {
            const path = urlMatch[1];
            const { data, error: signError } = await supabase.storage
              .from('permits')
              .createSignedUrl(path, 3600); // 1 hour expiry

            if (signError) {
              console.warn('Failed to create signed URL, using original:', signError);
              setPreviewUrl(permitFileUrl);
            } else {
              setPreviewUrl(data.signedUrl);
            }
          } else {
            setPreviewUrl(permitFileUrl);
          }
        } else {
          // Direct URL from another source
          setPreviewUrl(permitFileUrl);
        }
        setIsLoading(false);
        return;
      }

      // It's a storage path - generate signed URL
      // Handle paths with or without leading slash
      const cleanPath = permitFileUrl.startsWith('/') ? permitFileUrl.slice(1) : permitFileUrl;
      
      const { data, error: signError } = await supabase.storage
        .from('permits')
        .createSignedUrl(cleanPath, 3600); // 1 hour expiry

      if (signError) {
        // Try public URL as fallback
        const { data: publicData } = supabase.storage
          .from('permits')
          .getPublicUrl(cleanPath);
        
        if (publicData?.publicUrl) {
          setPreviewUrl(publicData.publicUrl);
        } else {
          throw signError;
        }
      } else {
        setPreviewUrl(data.signedUrl);
      }
    } catch (err: any) {
      console.error('Failed to load permit preview:', err);
      setError('Could not load preview. Tap to retry.');
      setPreviewUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [permitFileUrl]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  // No URL provided
  if (!permitFileUrl) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-border bg-muted/50", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading preview…</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div 
        className={cn("flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-destructive/30 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors", className)}
        onClick={loadPreview}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && loadPreview()}
      >
        <AlertCircle className="h-6 w-6 text-destructive" />
        <span className="text-sm text-destructive text-center">{error}</span>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  // PDF preview
  if (isPdf) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 p-4 rounded-lg border border-border bg-muted/50", className)}>
        <FileText className="h-12 w-12 text-primary" />
        <span className="text-sm text-muted-foreground">PDF Document</span>
        {previewUrl && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.open(previewUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            View Document
          </Button>
        )}
      </div>
    );
  }

  // Image preview
  if (previewUrl) {
    return (
      <div className={cn("relative", className)}>
        <img
          src={previewUrl}
          alt="Permit preview"
          className="max-w-full rounded-lg border border-border object-contain"
          style={{ maxHeight: '300px' }}
          onError={() => {
            setError('Failed to load image. Tap to retry.');
            setPreviewUrl(null);
          }}
        />
      </div>
    );
  }

  return null;
}
