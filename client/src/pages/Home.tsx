import { useState } from "react";
import { Link } from "wouter";
import logoKimsClub from "@assets/대지_1_1776987037351.png";
import {
  ClipboardCheck, ClipboardList,
  BookOpen, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

export default function Home() {
  const [manualOpen, setManualOpen] = useState(false);

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
