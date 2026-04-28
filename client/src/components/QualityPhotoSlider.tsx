import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { createPortal } from "react-dom";

function PhotoViewer({ urls, startIndex, onClose }: { urls: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + urls.length) % urls.length);
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % urls.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [urls.length, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full flex items-center justify-center p-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Counter */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm font-bold px-4 py-1.5 rounded-full z-10 pointer-events-none">
          {idx + 1} / {urls.length}
        </div>
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center active:scale-90 transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>
        {/* Image */}
        <img
          src={urls[idx]}
          alt={`품질사진 ${idx + 1}`}
          className="max-w-full max-h-[85vh] object-contain rounded-lg select-none"
          draggable={false}
        />
        {/* Arrows */}
        {urls.length > 1 && (
          <>
            <button
              onClick={() => setIdx(i => (i - 1 + urls.length) % urls.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-90 transition-all z-10"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
            <button
              onClick={() => setIdx(i => (i + 1) % urls.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-90 transition-all z-10"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </>
        )}
        {/* Dot indicators */}
        {urls.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {urls.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`rounded-full transition-all ${i === idx ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function QualityPhotoSlider({ urls }: { urls: string[] }) {
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  if (urls.length === 0) return null;

  return (
    <>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {urls.map((url, i) => (
          <button
            key={i}
            onClick={() => setViewIndex(i)}
            className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-purple-200 active:scale-95 transition-all"
          >
            <img
              src={url}
              alt={`품질사진 ${i + 1}`}
              className="w-full h-full object-cover hover:opacity-80 transition-opacity"
            />
          </button>
        ))}
        {urls.length > 1 && (
          <div className="shrink-0 flex items-center px-1">
            <span className="text-xs text-muted-foreground font-bold">{urls.length}장</span>
          </div>
        )}
      </div>

      {viewIndex !== null && (
        <PhotoViewer
          urls={urls}
          startIndex={viewIndex}
          onClose={() => setViewIndex(null)}
        />
      )}
    </>
  );
}
