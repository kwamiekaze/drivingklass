import { useState } from "react";
import { X, Play, Film } from "lucide-react";

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MediaModal({ isOpen, onClose }: MediaModalProps) {
  const [videoUrl, setVideoUrl] = useState("");
  
  if (!isOpen) return null;

  // Convert YouTube/Vimeo URLs to embed format
  const getEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    
    return null;
  };

  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, hsl(30 10% 8% / 0.95) 0%, hsl(25 8% 5% / 0.95) 100%)',
          border: '1px solid hsl(43 60% 40% / 0.4)',
          borderRadius: '1.25rem',
          boxShadow: '0 0 50px hsl(43 80% 52% / 0.15), 0 25px 50px -12px hsl(0 0% 0% / 0.5)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full transition-all duration-200 hover:bg-white/10 z-10"
          style={{ color: 'hsl(43 60% 60%)' }}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-8">
          {/* Title */}
          <h2 
            className="text-2xl md:text-3xl font-bold tracking-[0.1em] uppercase mb-6"
            style={{
              background: 'linear-gradient(135deg, hsl(38 75% 45%) 0%, hsl(43 85% 55%) 30%, hsl(48 90% 72%) 50%, hsl(43 85% 55%) 70%, hsl(38 75% 45%) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 10px hsl(43 80% 52% / 0.3))',
            }}
          >
            Media
          </h2>
          
          {/* Featured Video Section */}
          <div className="mb-6">
            <h3 
              className="text-sm font-semibold tracking-wide uppercase mb-4"
              style={{ color: 'hsl(43 60% 55%)' }}
            >
              Featured Video
            </h3>
            
            {/* Video embed or placeholder */}
            <div 
              className="aspect-video rounded-xl overflow-hidden"
              style={{
                background: 'hsl(25 5% 6%)',
                border: '1px solid hsl(43 50% 35% / 0.3)',
              }}
            >
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title="Featured Video"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(145deg, hsl(36 75% 35%) 0%, hsl(43 80% 52%) 100%)',
                      boxShadow: '0 0 30px hsl(43 80% 52% / 0.3)',
                    }}
                  >
                    <Play className="w-8 h-8" style={{ color: 'hsl(30 10% 8%)' }} />
                  </div>
                  <p className="text-sm" style={{ color: 'hsl(42 20% 60%)' }}>
                    No featured video set
                  </p>
                </div>
              )}
            </div>

            {/* Video URL input for demo purposes */}
            <div className="mt-4">
              <label 
                className="block text-xs font-medium tracking-wide mb-2"
                style={{ color: 'hsl(43 50% 50%)' }}
              >
                Enter YouTube or Vimeo URL
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full h-10 px-4 rounded-lg text-sm transition-all duration-200 focus:ring-2 focus:ring-gold/30 focus:outline-none"
                style={{
                  background: 'hsl(25 5% 10%)',
                  border: '1px solid hsl(43 50% 35% / 0.3)',
                  color: 'hsl(42 30% 90%)',
                }}
              />
            </div>
          </div>

          {/* Media Gallery Placeholder */}
          <div>
            <h3 
              className="text-sm font-semibold tracking-wide uppercase mb-4"
              style={{ color: 'hsl(43 60% 55%)' }}
            >
              Gallery
            </h3>
            <div 
              className="p-6 rounded-xl text-center"
              style={{
                background: 'hsl(25 5% 8%)',
                border: '1px solid hsl(43 50% 35% / 0.2)',
              }}
            >
              <Film className="w-10 h-10 mx-auto mb-3" style={{ color: 'hsl(43 60% 45%)' }} />
              <p className="text-sm" style={{ color: 'hsl(42 20% 60%)' }}>
                Media gallery coming soon
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
