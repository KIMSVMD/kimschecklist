import { useState } from "react";
import { Link } from "wouter";
import logoKimsClub from "@assets/대지_1_1776987037351.png";
import {
  ClipboardCheck, ClipboardList,
  BookOpen, X, ChevronDown, ChevronUp, Layers, Image as ImageIcon,
  Search, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuides } from "@/hooks/use-guides";
import type { Guide } from "@shared/schema";

const MANUAL_SECTIONS = [
  {
    id: 'home',
    title: '① 메인 화면',
    subtitle: '앱 시작 및 메뉴 선택',
    steps: [
      '새 점검 등록 → VM 점검 / 광고 점검 / 청소 점검 작성 시작',
      '점검 월별 피드백 → 내가 등록한 점검 확인 / 수정 / 삭제 가능',
    ],
  },
  {
    id: 'vm',
    title: '② VM 점검 등록',
    subtitle: '매장 진열 상태(VM) 점검',
    steps: [
      '상단 [VM 점검] 탭 선택',
      '지점 / 연도 / 월 선택',
      '빨간 숫자 뱃지가 있는 상품 → 아직 점검이 완료되지 않은 상품',
      '상품 선택 시 가이드 이미지 확인 (여러 장이면 좌·우 화살표로 이동, 탭하면 확대 및 핀치 줌 가능)',
      '체크리스트 항목별 우수(○) / 미흡(✕) 선택 후 현장 사진 첨부',
      '제출 버튼 클릭 → 점검 완료',
    ],
  },
  {
    id: 'ad',
    title: '③ 광고 점검 등록',
    subtitle: '매장 광고물 및 영상 운영 상태 점검',
    steps: [
      '상단 [광고 점검] 탭 선택',
      '지점 / 연도 / 월 선택',
      '빨간 숫자 뱃지가 있는 상품 → 아직 점검이 완료되지 않은 상품',
      '광고 영상이 있는 경우 가이드 상단 보라색 [영상] 버튼 클릭 → 광고 영상 다운로드 가능',
      '상품 선택 시 가이드 이미지 확인 (좌·우 화살표로 이동, 탭하면 확대 및 핀치 줌 가능)',
      '체크리스트 항목별 우수(○) / 미흡(✕) 선택 후 현장 사진 첨부',
      '제출 버튼 클릭 → 점검 완료',
    ],
  },
  {
    id: 'cleaning',
    title: '④ 청소 점검 등록',
    subtitle: '매장 구역별 청결 상태 점검',
    steps: [
      '지점 선택',
      '점검 구역 선택 (예: 농산 / 수산 / 공산 / 축산)',
      '점검 시간 선택 (오픈 점검 / 마감 점검)',
      '항목별 상태 선택 (정상 / 문제)',
      '제출 버튼 클릭 → 점검 완료',
      '※ 임시 저장 가능 · 매일 자정 자동 초기화',
    ],
  },
  {
    id: 'staff',
    title: '⑤ 점검 월별 피드백',
    subtitle: '등록한 점검 내용 확인',
    steps: [
      '지점 선택',
      '날짜별 점검 카드 확인',
      '카드에서 점검 내용 확인 및 답글 작성 가능',
      '점검 카드에서 수정 / 삭제 가능',
    ],
  },
];

function ManualSection({ section }: { section: typeof MANUAL_SECTIONS[0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-gray-50"
        onClick={() => setExpanded(v => !v)}
      >
        <div>
          <p className="text-sm font-black text-gray-800">{section.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{section.subtitle}</p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100">
              <div className="px-4 py-3 space-y-2">
                {section.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-green-800/10 text-green-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-700 leading-snug">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const GUIDE_TABS = [
  { key: 'vm', label: '진열 가이드' },
  { key: 'ad', label: '광고 가이드' },
  { key: 'quality', label: '품질 가이드' },
] as const;

type GuideTabKey = typeof GUIDE_TABS[number]['key'];

const CAT_ORDER = ['농산', '수산', '축산', '공산'];

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `등록일 ${dt.getFullYear()}.${dt.getMonth() + 1}.${dt.getDate()}.`;
}

function GuideCard({ guide, onClick }: { guide: Guide; onClick: () => void }) {
  const images = guide.imageUrls?.length ? guide.imageUrls : guide.imageUrl ? [guide.imageUrl] : [];

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="rounded-2xl overflow-hidden bg-white border border-gray-100 cursor-pointer shadow-sm"
      onClick={onClick}
      data-testid={`card-guide-${guide.id}`}
    >
      <div className="relative" style={{ height: '150px', background: 'rgba(0,99,65,0.08)' }}>
        {images.length > 0 ? (
          <img src={images[0]} alt={guide.product} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-10 h-10" style={{ color: 'rgba(0,99,65,0.25)' }} />
          </div>
        )}
        {images.length > 1 && (
          <span
            className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', fontFamily: "'Pretendard', sans-serif" }}
          >
            +{images.length - 1}
          </span>
        )}
      </div>
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#000', color: '#fff', fontFamily: "'Pretendard', sans-serif" }}
          >
            {guide.category}
          </span>
          {guide.storeType && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 text-gray-500"
              style={{ fontFamily: "'Pretendard', sans-serif" }}
            >
              {guide.storeType}
            </span>
          )}
        </div>
        <p
          className="text-sm font-bold text-gray-900 leading-snug line-clamp-2"
          style={{ fontFamily: "'Pretendard', sans-serif", letterSpacing: '-0.03em' }}
        >
          {guide.product}
        </p>
        <p className="text-[10px] text-gray-400" style={{ fontFamily: "'Pretendard', sans-serif" }}>
          {fmtDate(guide.updatedAt)}
        </p>
      </div>
    </motion.div>
  );
}

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
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: '#006341', color: '#fff', fontFamily: "'Pretendard', sans-serif" }}
            >
              {guide.category}
            </span>
            {guide.storeType && (
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-gray-200 text-gray-500"
                style={{ fontFamily: "'Pretendard', sans-serif" }}
              >
                {guide.storeType}
              </span>
            )}
            <p
              className="font-black text-gray-900 text-base"
              style={{ fontFamily: "'Pretendard', sans-serif", letterSpacing: '-0.04em' }}
            >
              {guide.product}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center active:scale-95 shrink-0 ml-2"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pb-10">
          {images.length > 0 && (
            <div className="relative" style={{ height: '260px', background: 'rgba(0,99,65,0.06)' }}>
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
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm active:scale-95"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setImgIdx(i => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm active:scale-95"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIdx(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-black' : 'bg-black/30'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="px-5 pt-4 space-y-4">
            {(guide.validFromYear || guide.validToYear) && (
              <p className="text-xs text-gray-400" style={{ fontFamily: "'Pretendard', sans-serif" }}>
                유효 기간: {guide.validFromYear && `${guide.validFromYear}년 ${guide.validFromMonth}월`}
                {guide.validFromYear && guide.validToYear && ' ~ '}
                {guide.validToYear && `${guide.validToYear}년 ${guide.validToMonth}월`}
              </p>
            )}

            {guide.points?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase" style={{ fontFamily: "'Pretendard', sans-serif" }}>체크포인트</p>
                {guide.points.map((pt, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-800/10 text-green-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-gray-700 leading-snug" style={{ fontFamily: "'Pretendard', sans-serif" }}>{pt}</p>
                  </div>
                ))}
              </div>
            )}

            {guide.items?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase" style={{ fontFamily: "'Pretendard', sans-serif" }}>점검 항목</p>
                {guide.items.map((it, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0 mt-2" />
                    <p className="text-sm text-gray-700 leading-snug" style={{ fontFamily: "'Pretendard', sans-serif" }}>{it}</p>
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

export default function Home() {
  const [manualOpen, setManualOpen] = useState(false);
  const [guideSheetOpen, setGuideSheetOpen] = useState(false);
  const [guideTab, setGuideTab] = useState<GuideTabKey>('vm');
  const [guideSearch, setGuideSearch] = useState('');
  const [guideCat, setGuideCat] = useState('전체');
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const { data: allGuides = [], isLoading: guidesLoading } = useGuides();

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Top bar — height 85px, shadow, padding 0 50px */}
      <header
        className="flex items-center justify-between bg-white"
        style={{
          height: '85px',
          padding: '0 50px',
          boxShadow: '0px 2px 3px rgba(0,0,0,0.1)',
        }}
      >
        <img src={logoKimsClub} alt="KIM'S CLUB" style={{ width: '198px', height: '31px', objectFit: 'contain' }} />
        <Link href="/admin/login">
          <button
            className="active:scale-95 transition-transform"
            style={{
              fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
              fontWeight: 600,
              fontSize: '18px',
              letterSpacing: '-0.04em',
              color: '#EAEAEA',
              background: '#000000',
              borderRadius: '100px',
              padding: '13px 35px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            data-testid="btn-admin-mode"
          >
            관리자 모드
          </button>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex flex-col items-center justify-center flex-1">
        <div className="flex flex-col items-center" style={{ gap: '0px' }}>

          {/* Title block — gap 8px between title and subtitle */}
          <div className="flex flex-col items-center" style={{ gap: '8px', marginBottom: '50px' }}>
            <h1
              className="text-center"
              style={{
                fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
                fontWeight: 700,
                fontSize: '50px',
                lineHeight: '60px',
                letterSpacing: '-0.04em',
                color: '#000000',
                margin: 0,
              }}
            >
              매장 점검 <span style={{ color: '#006341' }}>체크리스트</span>
            </h1>
            <p
              className="text-center"
              style={{
                fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
                fontWeight: 500,
                fontSize: '24px',
                lineHeight: '29px',
                letterSpacing: '-0.04em',
                color: 'rgba(0,0,0,0.4)',
                margin: 0,
              }}
            >
              현장 점검 · 진열 · 품질 관리 시스템
            </p>
          </div>

          {/* Cards row — 455px wide, gap 15px */}
          <div className="flex flex-row" style={{ gap: '15px', marginBottom: '30px' }}>
            {/* Green card */}
            <Link href="/checklist/new" data-testid="link-new-checklist">
              <motion.div
                whileTap={{ scale: 0.97 }}
                className="flex flex-col items-center justify-center cursor-pointer"
                style={{
                  width: '220px',
                  height: '220px',
                  background: '#006341',
                  borderRadius: '20px',
                  gap: '18px',
                  padding: '13px 35px',
                  boxSizing: 'border-box',
                }}
              >
                <ClipboardCheck style={{ width: '40px', height: '40px', color: '#FFFFFF' }} strokeWidth={2} />
                <div className="flex flex-col items-center" style={{ gap: '3px' }}>
                  <p style={{
                    fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
                    fontWeight: 700,
                    fontSize: '28px',
                    lineHeight: '33px',
                    letterSpacing: '-0.04em',
                    color: '#FFFFFF',
                    margin: 0,
                    textAlign: 'center',
                  }}>새 점검 등록</p>
                  <p style={{
                    fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
                    fontWeight: 500,
                    fontSize: '18px',
                    lineHeight: '21px',
                    letterSpacing: '-0.04em',
                    color: '#FFFFFF',
                    margin: 0,
                    textAlign: 'center',
                  }}>현장 점검 시작하기</p>
                </div>
              </motion.div>
            </Link>

            {/* White card */}
            <Link href="/staff-dashboard" data-testid="link-staff-dashboard">
              <motion.div
                whileTap={{ scale: 0.97 }}
                className="flex flex-col items-center justify-center cursor-pointer"
                style={{
                  width: '220px',
                  height: '220px',
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  gap: '18px',
                  padding: '13px 35px',
                  boxSizing: 'border-box',
                  filter: 'drop-shadow(0px 0px 6px rgba(0,0,0,0.25))',
                }}
              >
                <ClipboardList style={{ width: '40px', height: '40px', color: '#006341' }} strokeWidth={2} />
                <div className="flex flex-col items-center" style={{ gap: '3px' }}>
                  <p style={{
                    fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
                    fontWeight: 700,
                    fontSize: '28px',
                    lineHeight: '33px',
                    letterSpacing: '-0.04em',
                    color: '#006341',
                    margin: 0,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}>점검 월별 피드백</p>
                  <p style={{
                    fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
                    fontWeight: 500,
                    fontSize: '18px',
                    lineHeight: '21px',
                    letterSpacing: '-0.04em',
                    color: '#000000',
                    margin: 0,
                    textAlign: 'center',
                  }}>수정 및 삭제 가능</p>
                </div>
              </motion.div>
            </Link>
          </div>

          {/* Guide button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setGuideSheetOpen(true)}
            style={{
              width: '455px',
              height: '70px',
              background: '#006341',
              borderRadius: '15px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
              fontWeight: 600,
              fontSize: '26px',
              lineHeight: '31px',
              letterSpacing: '-0.04em',
              color: '#FFFFFF',
              marginBottom: '12px',
            }}
            data-testid="btn-open-guide"
          >
            매장 가이드 보기
          </motion.button>

          {/* Manual button — 455×70px, border-radius 15px, bg #EAEAEA */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setManualOpen(true)}
            style={{
              width: '455px',
              height: '70px',
              background: '#EAEAEA',
              borderRadius: '15px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
              fontWeight: 600,
              fontSize: '26px',
              lineHeight: '31px',
              letterSpacing: '-0.04em',
              color: '#000000',
            }}
            data-testid="btn-open-manual"
          >
            사용 매뉴얼 보기
          </motion.button>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="text-center"
        style={{
          padding: '20px 0',
          fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
          fontWeight: 400,
          fontSize: '12px',
          letterSpacing: '-0.02em',
          color: 'rgba(0,0,0,0.4)',
        }}
      >
        © 2026, 킴스클럽 VMD. All rights reserved.
      </footer>

      {/* Guide bottom sheet */}
      <AnimatePresence>
        {guideSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end"
            onClick={() => setGuideSheetOpen(false)}
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
              <div className="flex items-center justify-between px-6 pt-5 pb-0 shrink-0">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-green-800" />
                  <span
                    className="text-lg font-black text-gray-900"
                    style={{ fontFamily: "'Pretendard', sans-serif", letterSpacing: '-0.04em' }}
                  >
                    매장 가이드
                  </span>
                </div>
                <button
                  onClick={() => setGuideSheetOpen(false)}
                  className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center active:scale-95"
                  data-testid="btn-close-guide"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Tabs — underline style matching screenshot */}
              <div className="flex border-b border-gray-100 shrink-0 px-6 mt-3">
                {GUIDE_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setGuideTab(tab.key); setGuideCat('전체'); setGuideSearch(''); }}
                    className={`flex-1 py-3 text-sm transition-all border-b-2 -mb-px ${
                      guideTab === tab.key
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-400'
                    }`}
                    style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: guideTab === tab.key ? 700 : 500, letterSpacing: '-0.02em' }}
                    data-testid={`tab-guide-${tab.key}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search + Category chips — sticky controls */}
              <div className="px-4 pt-3 pb-2 space-y-2.5 shrink-0">
                {/* Search */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
                  <Search className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={guideSearch}
                    onChange={e => setGuideSearch(e.target.value)}
                    placeholder="가이드 검색..."
                    className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                    style={{ fontFamily: "'Pretendard', sans-serif", letterSpacing: '-0.02em' }}
                    data-testid="input-guide-search"
                  />
                  {guideSearch && (
                    <button onClick={() => setGuideSearch('')} className="text-gray-400 active:scale-95">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {/* Category chips */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar touch-pan-x pb-1">
                  {['전체', ...CAT_ORDER].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setGuideCat(cat)}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        guideCat === cat
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-600 border-gray-200'
                      }`}
                      style={{ fontFamily: "'Pretendard', sans-serif", letterSpacing: '-0.01em' }}
                      data-testid={`chip-guide-cat-${cat}`}
                    >
                      {cat === '전체' ? '전체보기' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content — 2-column grid */}
              <div className="overflow-y-auto flex-1 px-4 pb-10">
                {guidesLoading ? (
                  <div className="flex items-center justify-center py-20 text-gray-400">
                    <p style={{ fontFamily: "'Pretendard', sans-serif", fontSize: '14px' }}>불러오는 중...</p>
                  </div>
                ) : (() => {
                  const q = guideSearch.trim().toLowerCase();
                  const visible = allGuides
                    .filter(g => g.guideType === guideTab)
                    .filter(g => guideCat === '전체' || g.category === guideCat)
                    .filter(g => !q || g.product.toLowerCase().includes(q) || g.category.toLowerCase().includes(q))
                    .sort((a, b) => {
                      const ai = CAT_ORDER.indexOf(a.category);
                      const bi = CAT_ORDER.indexOf(b.category);
                      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                    });

                  if (visible.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                        <ImageIcon className="w-10 h-10 text-gray-200" />
                        <p style={{ fontFamily: "'Pretendard', sans-serif", fontSize: '14px' }}>
                          {q ? '검색 결과가 없습니다' : '등록된 가이드가 없습니다'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {visible.map(g => (
                        <GuideCard
                          key={g.id}
                          guide={g}
                          onClick={() => setSelectedGuide(g)}
                        />
                      ))}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guide detail sheet */}
      <AnimatePresence>
        {selectedGuide && (
          <GuideDetail guide={selectedGuide} onClose={() => setSelectedGuide(null)} />
        )}
      </AnimatePresence>

      {/* Manual bottom sheet */}
      <AnimatePresence>
        {manualOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end"
            onClick={() => setManualOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full bg-white rounded-t-3xl max-h-[92vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-green-800" />
                  <span className="text-lg font-black text-gray-900">사용 매뉴얼</span>
                </div>
                <button
                  onClick={() => setManualOpen(false)}
                  className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center active:scale-95"
                  data-testid="btn-close-manual"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <p className="px-6 pt-4 pb-2 text-xs text-gray-400">
                각 항목을 탭하면 실제 화면과 함께 자세한 설명을 볼 수 있어요.
              </p>

              <div className="overflow-y-auto flex-1 px-6 py-2 space-y-3 pb-8">
                {MANUAL_SECTIONS.map(section => (
                  <ManualSection key={section.id} section={section} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
