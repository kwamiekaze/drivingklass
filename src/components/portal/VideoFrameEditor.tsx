import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export interface VideoFraming {
  zoom: number; // 1..3
  x: number; // 0..100 (object-position X %)
  y: number; // 0..100 (object-position Y %)
}

export const DEFAULT_FRAMING: VideoFraming = { zoom: 1, x: 50, y: 50 };

interface VideoFrameEditorProps {
  open: boolean;
  src: string;
  initial?: Partial<VideoFraming> | null;
  title?: string;
  onClose: () => void;
  onSave: (framing: VideoFraming) => void;
}

/**
 * WYSIWYG video framing editor that mirrors the exact CSS
 * (`object-fit: cover; object-position; transform: scale`) used by
 * <ProfileAvatar/>, so what the user sees is what renders everywhere.
 */
export function VideoFrameEditor({
  open,
  src,
  initial,
  title = "Frame Profile Video",
  onClose,
  onSave,
}: VideoFrameEditorProps) {
  const [zoom, setZoom] = useState<number>(initial?.zoom ?? 1);
  const [x, setX] = useState<number>(initial?.x ?? 50);
  const [y, setY] = useState<number>(initial?.y ?? 50);
  const dragRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const pinch = useRef<{ startDist: number; startZoom: number } | null>(null);

  useEffect(() => {
    if (open) {
      setZoom(initial?.zoom ?? 1);
      setX(initial?.x ?? 50);
      setY(initial?.y ?? 50);
    }
  }, [open, initial]);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e as any).pointerType === "touch" && (e.currentTarget as any)._activePointers) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragging.current = { startX: e.clientX, startY: e.clientY, ox: x, oy: y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !dragRef.current) return;
    const rect = dragRef.current.getBoundingClientRect();
    const dx = e.clientX - dragging.current.startX;
    const dy = e.clientY - dragging.current.startY;
    // Movement inverse: dragging right shows content further right -> position moves left
    const nx = clamp(dragging.current.ox - (dx / rect.width) * 100, 0, 100);
    const ny = clamp(dragging.current.oy - (dy / rect.height) * 100, 0, 100);
    setX(nx);
    setY(ny);
  };
  const onPointerUp = () => {
    dragging.current = null;
  };

  // Touch pinch-to-zoom
  const activeTouches = useRef<Map<number, { x: number; y: number }>>(new Map());
  const onTouchStart = (e: React.TouchEvent) => {
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      activeTouches.current.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
    if (e.touches.length === 2) {
      const [a, b] = Array.from(activeTouches.current.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      pinch.current = { startDist: d, startZoom: zoom };
      dragging.current = null;
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      activeTouches.current.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
    if (e.touches.length === 2 && pinch.current) {
      e.preventDefault();
      const [a, b] = Array.from(activeTouches.current.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const next = clamp(pinch.current.startZoom * (d / pinch.current.startDist), 1, 3);
      setZoom(Number(next.toFixed(3)));
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      activeTouches.current.delete(e.changedTouches[i].identifier);
    }
    if (activeTouches.current.size < 2) pinch.current = null;
  };

  const reset = () => {
    setZoom(1);
    setX(50);
    setY(50);
  };

  const apply = () => {
    onSave({ zoom: Number(zoom.toFixed(3)), x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div
          ref={dragRef}
          className="relative w-full aspect-square bg-muted rounded-full overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <video
            src={src}
            className="w-full h-full pointer-events-none"
            style={{
              objectFit: "cover",
              objectPosition: `${x}% ${y}%`,
              transform: `scale(${zoom})`,
              transformOrigin: "center",
            }}
            autoPlay
            muted
            loop
            playsInline
            disablePictureInPicture
            preload="metadata"
          />
        </div>

        <div className="flex items-center gap-3 px-2 pt-2">
          <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" aria-label="Zoom out" />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.05}
            onValueChange={(v) => setZoom(v[0])}
            className="flex-1"
            aria-label="Zoom"
          />
          <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" aria-label="Zoom in" />
        </div>
        <p className="text-xs text-muted-foreground text-center px-2">
          Drag to pan · pinch or use the slider to zoom
        </p>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="min-h-[44px] w-full sm:w-auto gap-2"
            onClick={reset}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-h-[44px] w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="button" onClick={apply} className="min-h-[44px] w-full sm:w-auto">
              Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
