import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useGuides } from "@/hooks/use-guides";
import type { Guide } from "@shared/schema";
import { Search, X, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const GUIDE_TABS = [
  { key: 'vm',      label: '진열 가이드' },
  { key: 'ad',      label: '광고 가이드' },
  { key: 'quality', label: '품질 가이드' },
] as const;
type GuideTabKey = typeof GUIDE_TABS[number]['key'];

const CAT_ORDER = ['농산', '수산', '축산', '공산'];

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `등록일 ${dt.getFullYear()}. ${dt.getMonth() + 1}. ${dt.getDate()}.`;
}

/* ── Small card matching the reference design ── */
function GuideCard({ guide, onClick }: { guide: Guide; onClick: () => void }) {
  const images = guide.imageUrls?.length ? guide.imageUrls : guide.imageUrl ? [guide.imageUrl] : [];
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="rounded-2xl overflow-hidden bg-white cursor-pointer"
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.10)' }}
      onClick={onClick}
      data-testid={`card-guide-${guide.id}`}
    >
      {/* Image — square-ish 4:3 */}
      <div
        className="relative w-full"
        style={{ aspectRatio: '4/3', background: 'rgba(0,99,65,0.09)' }}
      >
        {images.length > 0 ? (
          <img
            src={images[0]}
            alt={guide.product}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-10 h-10" style={{ color: 'rgba(0,99,65,0.18)' }} />
          </div>
        )}
        {images.length > 1 && (
          <span
            className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold"
            style={{ background: 'rgba(0,0,0,0.48)', color: '#fff', fontFamily: "'Pretendard', sans-serif" }}
          >
            +{images.length - 1}
          </span>
        )}
      </div>

      {/* Info below image */}
      <div className="px-3 pt-2.5 pb-3 space-y-1">
        {/* Badge: storeType or category */}
        <span
          className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full"
          style={{ background: '#111', color: '#fff', fontFamily: "'Pretendard', sans-serif" }}
        >
          {guide.storeType || guide.category}
        </span>
        {/* Title */}
        <p
          className="font-bold text-gray-900 leading-snug line-clamp-2"
          style={{ fontFamily: "'Pretendard', sans-serif", fontSize: '14px', letterSpacing: '-0.03em' }}
        >
          {guide.product}
        </p>
        {/* Date */}
        <p
          className="text-gray-400"
          style={{ fontFamily: "'Pretendard', sans-serif", fontSize: '11px' }}
        >
          {fmtDate(guide.updatedAt)}
        </p>
      </div>
    </motion.div>
  );
}

/* ── Detail bottom-sheet ── */
function GuideDetail({ guide, onClose }: { guide: Guide; onClose: () => void }) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = guide.imageUrls?.length ? guide.imageUrls : guide.imageUrl ? [guide.imageUrl] : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full bg-white rounded-t-3xl flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex-1 pr-3 space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              <span
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: '#006341', color: '#fff', fontFamily: "'Pretendard', sans-serif" }}
              >
                {guide.category}
              </span>
              {guide.storeType && (
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-gray-200 text-gray-500"
                  style={{ fontFamily: "'Pretendard', sans-serif" }}
                >
                  {guide.storeType}
                </span>
              )}
            </div>
            <p
              className="font-black text-gray-900"
              style={{ fontFamily: "'Pretendard', sans-serif", fontSize: '17px', letterSpacing: '-0.04em' }}
            >
              {guide.product}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center active:scale-95 shrink-0"
            data-testid="btn-close-guide-detail"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pb-12">
          {/* Image carousel */}
          {images.length > 0 && (
            <div
              className="relative w-full"
              style={{ aspectRatio: '4/3', maxHeight: '300px', background: 'rgba(0,99,65,0.07)' }}
            >
              <img
                src={images[imgIdx]}
                alt={guide.product}
                className="w-full h-full object-contain cursor-zoom-in"
                onClick={() => (window as any).__openLightbox?.(images[imgIdx])}
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 shadow flex items-center justify-center"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setImgIdx(i => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 shadow flex items-center justify-center"
                  >
                    <ChevronRight className="w-4 h-4" />
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
          )}

          <div className="px-5 pt-4 space-y-5">
            {(guide.validFromYear || guide.validToYear) && (
              <p className="text-xs text-gray-400" style={{ fontFamily: "'Pretendard', sans-serif" }}>
                유효 기간:{' '}
                {guide.validFromYear && `${guide.validFromYear}년 ${guide.validFromMonth}월`}
                {guide.validFromYear && guide.validToYear && ' ~ '}
                {guide.validToYear && `${guide.validToYear}년 ${guide.validToMonth}월`}
              </p>
            )}
            {guide.points?.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[11px] font-bold text-gray-400 tracking-widest" style={{ fontFamily: "'Pretendard', sans-serif" }}>
                  체크포인트
                </p>
                {guide.points.map((pt, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-green-800/10 text-green-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-700 leading-snug" style={{ fontFamily: "'Pretendard', sans-serif" }}>
                      {pt}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {guide.items?.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[11px] font-bold text-gray-400 tracking-widest" style={{ fontFamily: "'Pretendard', sans-serif" }}>
                  점검 항목
                </p>
                {guide.items.map((it, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0 mt-2" />
                    <p className="text-sm text-gray-700 leading-snug" style={{ fontFamily: "'Pretendard', sans-serif" }}>
                      {it}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════
   Main page component
══════════════════════════════════ */
export default function GuidesPage() {
  const [activeTab, setActiveTab] = useState<GuideTabKey>('vm');
  const [search, setSearch]       = useState('');
  const [cat, setCat]             = useState('전체');
  const [selected, setSelected]   = useState<Guide | null>(null);

  const { data: allGuides = [], isLoading } = useGuides();

  const q = search.trim().toLowerCase();

  const visible = allGuides
    .filter(g => g.guideType === activeTab)
    .filter(g => cat === '전체' || g.category === cat)
    .filter(g =>
      !q ||
      g.product.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      (g.storeType ?? '').toLowerCase().includes(q)
    );

  /* group by product name, preserving CAT_ORDER for sorting within category */
  const productGroups: { product: string; category: string; items: Guide[] }[] = [];
  const seen = new Map<string, number>();
  const sorted = [...visible].sort((a, b) => {
    const ai = CAT_ORDER.indexOf(a.category);
    const bi = CAT_ORDER.indexOf(b.category);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  sorted.forEach(g => {
    const key = g.product;
    if (!seen.has(key)) {
      seen.set(key, productGroups.length);
      productGroups.push({ product: g.product, category: g.category, items: [] });
    }
    productGroups[seen.get(key)!].items.push(g);
  });

  return (
    <Layout title="매장 가이드" showBack={true}>
      <div className="flex flex-col h-full bg-white">

        {/* ── Sticky filter header ── */}
        <div className="sticky top-0 z-40 bg-white" style={{ borderBottom: '1px solid #f0f0f0' }}>

          {/* Guide-type tabs — underline style */}
          <div className="flex overflow-x-auto no-scrollbar border-b border-gray-100 px-4">
            {GUIDE_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setCat('전체'); setSearch(''); }}
                className={`shrink-0 py-3.5 px-4 text-[15px] transition-all border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-400'
                }`}
                style={{
                  fontFamily: "'Pretendard', sans-serif",
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  letterSpacing: '-0.02em',
                }}
                data-testid={`tab-guide-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-4 pt-3 pb-2">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: '#F2F2F2' }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: '#999' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="가이드 검색..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{
                  fontFamily: "'Pretendard', sans-serif",
                  letterSpacing: '-0.02em',
                  color: '#222',
                }}
                data-testid="input-guide-search"
              />
              {search && (
                <button onClick={() => setSearch('')} className="active:scale-95">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3 touch-pan-x">
            {['전체', ...CAT_ORDER].map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className="shrink-0 transition-all"
                style={{
                  padding: '6px 16px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: "'Pretendard', sans-serif",
                  letterSpacing: '-0.01em',
                  background: cat === c ? '#111' : '#fff',
                  color: cat === c ? '#fff' : '#555',
                  border: cat === c ? '1.5px solid #111' : '1.5px solid #ddd',
                }}
                data-testid={`chip-guide-cat-${c}`}
              >
                {c === '전체' ? '전체보기' : c}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-4 pt-2 pb-12">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <p style={{ fontFamily: "'Pretendard', sans-serif", fontSize: '14px', color: '#aaa' }}>
                불러오는 중...
              </p>
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
                <div key={group.product}>
                  {/* Section header: "상품명  [카테고리]" */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="font-bold text-gray-900"
                      style={{
                        fontFamily: "'Pretendard', sans-serif",
                        fontSize: '16px',
                        letterSpacing: '-0.03em',
                      }}
                    >
                      {group.product}
                    </span>
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: '#f0f0f0',
                        color: '#666',
                        fontFamily: "'Pretendard', sans-serif",
                      }}
                    >
                      {group.category}
                    </span>
                  </div>

                  {/* 2-column grid */}
                  <div className="grid grid-cols-2 gap-3">
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

      {/* Detail overlay */}
      <AnimatePresence>
        {selected && (
          <GuideDetail guide={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </Layout>
  );
}
