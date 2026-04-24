import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useGuides } from "@/hooks/use-guides";
import type { Guide } from "@shared/schema";
import { Search, X, Image as ImageIcon, ChevronLeft, ChevronRight, ChevronRight as ChevRt } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CAT_TABS = ['농산', '수산', '축산', '공산'];

const GUIDE_TYPE_TABS = [
  { key: 'vm',      label: '진열' },
  { key: 'ad',      label: '광고' },
  { key: 'quality', label: '품질' },
] as const;
type GuideTypeKey = typeof GUIDE_TYPE_TABS[number]['key'];

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `등록일: ${dt.getFullYear()}. ${dt.getMonth() + 1}. ${dt.getDate()}.`;
}

/* ── Card ── */
function GuideCard({ guide, onClick }: { guide: Guide; onClick: () => void }) {
  const images = guide.imageUrls?.length ? guide.imageUrls : guide.imageUrl ? [guide.imageUrl] : [];
  const badgeText = guide.category;

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="rounded-xl overflow-hidden bg-white cursor-pointer"
      style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.08)', border: '1px solid #efefef' }}
      onClick={onClick}
      data-testid={`card-guide-${guide.id}`}
    >
      {/* Image with white padding */}
      <div className="p-2.5 pb-0">
      <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)' }}>
        {images.length > 0 ? (
          <img src={images[0]} alt={guide.product} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8" style={{ color: 'rgba(0,99,65,0.2)' }} />
          </div>
        )}
        {images.length > 1 && (
          <span
            className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ background: 'rgba(0,0,0,0.48)', color: '#fff' }}
          >
            +{images.length - 1}
          </span>
        )}
      </div>
      </div>

      {/* Info below image */}
      <div className="px-2.5 pt-2 pb-2.5 space-y-1">
        <span
          className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: '#006341', color: '#fff' }}
        >
          {badgeText}
        </span>
        <p
          className="font-bold text-gray-900 leading-snug line-clamp-2"
          style={{ fontFamily: "'Pretendard', sans-serif", fontSize: '12px', letterSpacing: '-0.02em' }}
        >
          {guide.product}
        </p>
        <p style={{ fontFamily: "'Pretendard', sans-serif", fontSize: '10px', color: '#bbb' }}>
          {fmtDate(guide.updatedAt)}
        </p>
      </div>
    </motion.div>
  );
}

/* ── Detail Modal ── */
function GuideDetail({ guide, onClose }: { guide: Guide; onClose: () => void }) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = guide.imageUrls?.length ? guide.imageUrls : guide.imageUrl ? [guide.imageUrl] : [];

  const dateStr = (() => {
    if (!guide.updatedAt) return '';
    const dt = new Date(guide.updatedAt as string);
    return `등록일: ${dt.getFullYear()}. ${dt.getMonth() + 1}. ${dt.getDate()}.`;
  })();

  const hasValidity = !!(guide.validFromYear || guide.validToYear);
  const validityStr = [
    guide.validFromYear ? `${guide.validFromYear}년 ${guide.validFromMonth}월` : '',
    guide.validToYear ? `${guide.validToYear}년 ${guide.validToMonth}월` : '',
  ].filter(Boolean).join(' ~ ');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full bg-white rounded-3xl flex flex-col"
        style={{ maxHeight: '90vh', maxWidth: '640px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0 shrink-0">
          <span
            className="inline-flex items-center gap-1 text-[12px] font-bold px-3 py-1 rounded-full"
            style={{ background: '#006341', color: '#fff', fontFamily: "'Pretendard', sans-serif" }}
          >
            {guide.category}
            {guide.storeType && (
              <>
                <ChevRt className="w-3 h-3 opacity-70" />
                {guide.storeType}
              </>
            )}
          </span>
          <div className="flex items-center gap-3">
            {dateStr && (
              <span className="text-[12px] text-gray-400" style={{ fontFamily: "'Pretendard', sans-serif" }}>
                {dateStr}
              </span>
            )}
            <button onClick={onClose} className="flex items-center justify-center active:scale-95 shrink-0" data-testid="btn-close-guide-detail">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 pb-10">
          <div className="px-5 pt-4 pb-3">
            <h2
              className="font-black text-gray-900 leading-tight"
              style={{ fontFamily: "'Pretendard', sans-serif", fontSize: '22px', letterSpacing: '-0.04em' }}
            >
              {guide.product}
            </h2>
          </div>

          {guide.storeType && (
            <div className="px-5 pb-4 flex items-center gap-2">
              <span className="text-[13px] font-bold text-gray-700" style={{ fontFamily: "'Pretendard', sans-serif" }}>
                점포 유형
              </span>
              <span
                className="px-2.5 py-0.5 rounded-full text-[12px] font-medium"
                style={{ background: '#f0f0f0', color: '#444', fontFamily: "'Pretendard', sans-serif" }}
              >
                {guide.storeType}
              </span>
            </div>
          )}

          {images.length > 0 && (
            <div className="px-4 pb-1">
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)' }}>
                <img
                  src={images[imgIdx]}
                  alt={guide.product}
                  className="w-full object-contain cursor-zoom-in"
                  style={{ maxHeight: '440px' }}
                  onClick={() => (window as any).__openLightbox?.(images[imgIdx])}
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 shadow flex items-center justify-center active:scale-95"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setImgIdx(i => (i + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 shadow flex items-center justify-center active:scale-95"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setImgIdx(i)}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-black' : 'bg-black/25'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="px-5 pt-4 space-y-3">
            {hasValidity && (
              <div className="rounded-xl px-4 py-3.5 flex items-center gap-3" style={{ background: '#F5F5F5' }}>
                <span className="text-[13px] font-bold text-gray-700" style={{ fontFamily: "'Pretendard', sans-serif" }}>유효 기간</span>
                <div className="w-px h-4 bg-gray-300 shrink-0" />
                <span className="text-[13px] text-gray-600" style={{ fontFamily: "'Pretendard', sans-serif" }}>{validityStr}</span>
              </div>
            )}

            {guide.points?.length > 0 && (
              <div className="rounded-xl px-4 py-3.5" style={{ background: '#F5F5F5' }}>
                <p className="text-[11px] font-bold text-gray-400 mb-2.5" style={{ fontFamily: "'Pretendard', sans-serif" }}>점검가이드</p>
                <div className="space-y-2.5">
                  {guide.points.map((pt, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span
                        className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: '#006341' }}
                      >
                        {i + 1}
                      </span>
                      <p className="text-[13px] text-gray-700 leading-snug" style={{ fontFamily: "'Pretendard', sans-serif" }}>{pt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════
   Main page
══════════════════════════════════ */
export default function GuidesPage() {
  const [guideType, setGuideType] = useState<GuideTypeKey>('vm');
  const [activeCat, setActiveCat] = useState('전체');
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<Guide | null>(null);

  const { data: allGuides = [], isLoading } = useGuides();

  const q = search.trim().toLowerCase();

  const visible = allGuides
    .filter(g => g.guideType === guideType)
    .filter(g => activeCat === '전체' || g.category === activeCat)
    .filter(g =>
      !q ||
      g.product.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      (g.storeType ?? '').toLowerCase().includes(q)
    );

  /* Group by product */
  const productGroups: { product: string; storeType: string; items: Guide[] }[] = [];
  const seen = new Map<string, number>();
  visible.forEach(g => {
    const key = `${g.product}__${g.storeType ?? ''}`;
    if (!seen.has(key)) {
      seen.set(key, productGroups.length);
      productGroups.push({ product: g.product, storeType: g.storeType ?? '', items: [] });
    }
    productGroups[seen.get(key)!].items.push(g);
  });

  return (
    <Layout title="매장 가이드" showBack={true}>
      <div className="flex flex-col h-full bg-white">

        {/* ── Filter header ── */}
        <div className="sticky top-0 z-40 bg-white" style={{ borderBottom: '1px solid #f0f0f0' }}>

          {/* Guide type tabs */}
          <div className="flex border-b border-gray-100 px-4 md:px-[50px]">
            {GUIDE_TYPE_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setGuideType(tab.key); setActiveCat('전체'); setSearch(''); }}
                className={`shrink-0 py-3.5 px-5 text-[15px] transition-all border-b-2 -mb-px whitespace-nowrap ${
                  guideType === tab.key ? 'border-black text-black' : 'border-transparent text-gray-400'
                }`}
                style={{
                  fontFamily: "'Pretendard', sans-serif",
                  fontWeight: guideType === tab.key ? 700 : 500,
                  letterSpacing: '-0.02em',
                }}
                data-testid={`tab-guide-type-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-4 md:px-[50px] pt-3 pb-2">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#F2F2F2' }}>
              <Search className="w-4 h-4 shrink-0" style={{ color: '#999' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="가이드 검색..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ fontFamily: "'Pretendard', sans-serif", letterSpacing: '-0.02em', color: '#222' }}
                data-testid="input-guide-search"
              />
              {search && (
                <button onClick={() => setSearch('')}>
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 md:px-[50px] pb-3 touch-pan-x">
            {['전체', ...CAT_TABS].map(c => (
              <button
                key={c}
                onClick={() => { setActiveCat(c); setSearch(''); }}
                className="shrink-0 transition-all"
                style={{
                  padding: '6px 16px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: "'Pretendard', sans-serif",
                  letterSpacing: '-0.01em',
                  background: activeCat === c ? '#111' : '#fff',
                  color: activeCat === c ? '#fff' : '#555',
                  border: activeCat === c ? '1.5px solid #111' : '1.5px solid #ddd',
                }}
                data-testid={`chip-guide-cat-${c}`}
              >
                {c === '전체' ? '전체보기' : c}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-4 md:px-[50px] pt-3 pb-12">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <p style={{ fontFamily: "'Pretendard', sans-serif", fontSize: '14px', color: '#aaa' }}>불러오는 중...</p>
            </div>
          ) : productGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <ImageIcon className="w-12 h-12" style={{ color: '#e0e0e0' }} />
              <p style={{ fontFamily: "'Pretendard', sans-serif", fontSize: '14px', color: '#aaa' }}>
                {q ? '검색 결과가 없습니다' : '등록된 가이드가 없습니다'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {productGroups.map(group => (
                <div key={`${group.product}__${group.storeType}`}>
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="font-bold text-gray-900"
                      style={{ fontFamily: "'Pretendard', sans-serif", fontSize: '15px', letterSpacing: '-0.03em' }}
                    >
                      {group.product}
                    </span>
                    {group.storeType && (
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: '#f0f0f0', color: '#666', fontFamily: "'Pretendard', sans-serif" }}
                      >
                        {group.storeType}
                      </span>
                    )}
                  </div>
                  {/* Responsive grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {group.items.map(g => (
                      <GuideCard key={g.id} guide={g} onClick={() => setSelected(g)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <GuideDetail guide={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </Layout>
  );
}
