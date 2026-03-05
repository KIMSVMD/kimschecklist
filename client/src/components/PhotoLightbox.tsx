import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Download, ZoomIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PhotoLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function PhotoLightbox({ src, alt = "사진", onClose }: PhotoLightboxProps) {
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [src, onClose]);

  const handleDownload = async () => {
    if (!src) return;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = blob.type.split("/")[1] || "jpg";
      a.download = `photo_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // fallback: open in new tab for manual save
      window.open(src, "_blank");
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const dy = e.changedTouches[0].clientY - startY.current;
    if (dy > 80) onClose();
    startY.current = null;
  };

  return createPortal(
    <AnimatePresence>
      {src && (
        <motion.div
          key="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[9999] flex flex-col bg-black/95"
          onClick={onClose}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-4 py-4 shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
              data-testid="btn-lightbox-close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <p className="text-white/60 text-sm font-medium select-none">아래로 스와이프하면 닫힙니다</p>
            <button
              onClick={handleDownload}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
              data-testid="btn-lightbox-download"
              title="사진 저장"
            >
              <Download className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Photo */}
          <div
            className="flex-1 flex items-center justify-center px-2 pb-8 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <motion.img
              key={src}
              src={src}
              alt={alt}
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="max-w-full max-h-full object-contain rounded-xl select-none"
              draggable={false}
            />
          </div>

          {/* Bottom hint */}
          <div className="pb-8 flex justify-center shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-bold text-sm active:bg-white/20 transition-all"
              data-testid="btn-lightbox-save"
            >
              <Download className="w-4 h-4" />
              사진 저장하기
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/**
 * Thin wrapper: wraps children in a clickable div that opens the lightbox.
 * Usage:  <PhotoThumbnail src={url}><img .../></PhotoThumbnail>
 */
interface PhotoThumbnailProps {
  src: string | null | undefined;
  children: React.ReactNode;
  className?: string;
}

export function PhotoThumbnail({ src, children, className }: PhotoThumbnailProps) {
  if (!src) return <>{children}</>;
  return (
    <>
      <button
        type="button"
        className={`relative group ${className ?? ""}`}
        onClick={e => {
          e.stopPropagation();
          (window as any).__openLightbox?.(src);
        }}
        data-testid="btn-photo-thumbnail"
      >
        {children}
        <div className="absolute inset-0 bg-black/0 group-active:bg-black/20 rounded-xl flex items-center justify-center transition-all">
          <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 group-active:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
      </button>
    </>
  );
}
