import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { PhotoThumbnail } from "@/components/PhotoLightbox";
import type { CleaningItemGuide } from "@shared/schema";

function GuideColumn({ title, photos, note, dark }: { title: string; photos: string[]; note: string | null; dark: boolean }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col border border-border">
      <div className={`text-center text-xs font-black py-1 ${dark ? "bg-white text-black border-b-2 border-black" : "bg-zinc-600 text-white"}`}>
        {title}
      </div>
      <div className="grid grid-cols-2 gap-1 p-1 flex-1 content-start">
        {photos.map((url, i) => (
          <PhotoThumbnail key={url + i} src={url} className={photos.length === 1 ? "col-span-2" : ""}>
            <img src={url} alt={`${title} 예시 ${i + 1}`} className="w-full aspect-square object-cover rounded" />
          </PhotoThumbnail>
        ))}
        {photos.length === 0 && (
          <div className="col-span-2 aspect-[2/1] flex items-center justify-center text-[11px] text-muted-foreground">사진 없음</div>
        )}
      </div>
      {note && <p className="text-[11px] font-bold text-secondary text-center px-1.5 py-1.5 border-t border-border whitespace-pre-line">{note}</p>}
    </div>
  );
}

// "매뉴얼 가이드 [보기/접기]" box with BEST / WORST example photos for one cleaning item.
export function CleaningItemGuidePanel({ guide }: { guide: CleaningItemGuide }) {
  const [open, setOpen] = useState(false);
  const best = guide.bestPhotos ?? [];
  const worst = guide.worstPhotos ?? [];

  return (
    <div className="rounded-2xl border border-border bg-muted/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5"
        data-testid="btn-cleaning-guide-toggle"
      >
        <span className="flex items-center gap-1.5 text-sm font-bold text-secondary">
          <ClipboardCheck className="w-4 h-4 text-muted-foreground" /> 매뉴얼 가이드
        </span>
        <span className="text-xs font-bold border border-secondary rounded-md px-2 py-0.5 bg-white text-secondary">
          {open ? "접기" : "보기"}
        </span>
      </button>
      {open && (
        <div className="flex gap-0 bg-white px-2 pb-2">
          <GuideColumn title="BEST" photos={best} note={guide.bestNote} dark />
          <GuideColumn title="WORST" photos={worst} note={guide.worstNote} dark={false} />
        </div>
      )}
    </div>
  );
}
