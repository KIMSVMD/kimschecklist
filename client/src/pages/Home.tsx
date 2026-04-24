import { useState } from "react";
import { Link, useLocation } from "wouter";
import logoKimsClub from "@assets/대지_1_1776987037351.png";
import {
  ClipboardCheck, ClipboardList,
  BookOpen, X, ChevronDown, ChevronUp,
  Home as HomeIcon, ChevronLeft, ChevronRight, RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MANUAL_SECTIONS = [
  {
    id: 'home',
    title: '① 메인 화면',
    subtitle: '앱 시작 및 메뉴 선택',
    steps: [
      '새 점검 등록 → VM·광고·품질·청소 점검 작성 시작',
      '점검 월별 피드백 → 내가 등록한 점검 확인 / 수정 / 삭제',
      '매장 가이드 보기 → 진열·광고·품질 가이드 이미지 및 자료 열람',
    ],
  },
  {
    id: 'vm',
    title: '② 진열(+광고) 점검 등록',
    subtitle: '매장 진열 상태 및 광고·셀링 점검 (한 번에)',
    steps: [
      '상단 [진열(+광고)] 탭 선택 후 지점 / 연도 / 월 설정',
      '카테고리(농산·수산·축산·공산) 선택',
      '품목군 선택 (예: 시즌, 수입과일, 데일리 등)',
      '상품 선택 — 빨간 숫자 뱃지 = 아직 미완료 상품',
      '가이드 이미지 확인 (좌·우 화살표로 이동, 탭하면 확대·핀치줌)',
      '[진열 점검] 항목별 우수(○) / 미흡(✕) 선택 후 현장 사진 첨부',
      '같은 화면 하단 [광고(+셀링) 점검] 항목도 이어서 작성',
      '광고 영상이 있는 경우 [영상] 버튼으로 광고 영상 다운로드 가능',
      '제출 버튼 클릭 → 진열·광고 점검 동시 완료',
    ],
  },
  {
    id: 'quality',
    title: '③ 품질 점검 등록',
    subtitle: '신선식품 품질 등급 점검 (농산·수산·축산)',
    steps: [
      '상단 [품질 점검] 탭 선택 후 지점 / 연도 / 월 설정',
      '카테고리(농산·수산·축산) → 품목군 → 상품 선택',
      '품질 가이드 이미지 확인 후 항목별 등급 선택 (A / B / C / E)',
      '선도·상해·규격·혼입율·형상 기준별로 등급 입력',
      '현장 사진 첨부 후 제출 버튼 클릭 → 점검 완료',
      '※ 가중치가 설정된 항목은 자동으로 가중 점수가 계산됩니다',
    ],
  },
  {
    id: 'cleaning',
    title: '④ 청소 점검 등록',
    subtitle: '매장 구역별 청결 상태 점검',
    steps: [
      '지점 선택',
      '점검 구역 선택 (입구 / 농산 / 수산 / 축산 / 공산)',
      '점검 시간 선택 (오픈 점검 / 마감 점검)',
      '항목별 상태 선택 (정상 / 부분불량 / 문제)',
      '문제 발생 시 사진 및 메모 첨부 가능',
      '제출 버튼 클릭 → 점검 완료',
      '※ 임시 저장 가능 · 매일 자정 자동 초기화',
    ],
  },
  {
    id: 'staff',
    title: '⑤ 점검 월별 피드백',
    subtitle: '등록한 점검 내용 확인 및 소통',
    steps: [
      '지점 / 연도 / 월 선택 후 점검 카드 목록 확인',
      '카드를 탭하면 점검 상세 내용 확인 가능',
      '관리자 코멘트가 있는 경우 카드에 표시 — 답글 작성 가능',
      '점검 카드에서 수정(미채점 상태) / 삭제 가능',
      '※ 관리자가 점수를 입력하면 카드에 점수 및 등급이 표시됩니다',
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
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-green-800/10 text-green-800 text-[10px] font-black flex items-center justify-center shrink-0">
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

      {/* Top bar — responsive */}
      <header
        className="flex items-center justify-between bg-white shrink-0 md:h-[85px] h-[60px] md:px-[50px] px-4"
        style={{ boxShadow: '0px 2px 3px rgba(0,0,0,0.1)' }}
      >
        <img
          src={logoKimsClub}
          alt="KIM'S CLUB"
          className="md:w-[198px] md:h-[31px] h-[20px] w-auto object-contain"
        />
        <Link href="/admin/login">
          <button
            className="active:scale-95 transition-transform font-semibold text-[#EAEAEA] bg-black rounded-full md:text-lg text-[13px] md:px-[35px] md:py-[13px] px-[18px] py-[8px] whitespace-nowrap border-none cursor-pointer"
            style={{ fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif", letterSpacing: '-0.04em' }}
            data-testid="btn-admin-mode"
          >
            관리자 모드
          </button>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex flex-col items-center justify-center flex-1 pb-20 md:pb-0 px-4 md:px-0">
        <div className="flex flex-col items-center w-full md:w-auto">

          {/* Title block */}
          <div className="flex flex-col items-center mb-8 md:mb-[50px] gap-2">
            <h1
              className="text-center md:text-[50px] md:leading-[60px] text-[32px] leading-[40px]"
              style={{
                fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
                fontWeight: 700,
                letterSpacing: '-0.04em',
                color: '#000000',
                margin: 0,
              }}
            >
              매장 점검 <span style={{ color: '#006341' }}>체크리스트</span>
            </h1>
            <p
              className="text-center md:text-[24px] md:leading-[29px] text-[15px] leading-[22px]"
              style={{
                fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
                fontWeight: 500,
                letterSpacing: '-0.04em',
                color: 'rgba(0,0,0,0.4)',
                margin: 0,
              }}
            >
              현장 점검 · 진열 · 품질 관리 시스템
            </p>
          </div>

          {/* Cards row */}
          <div className="flex flex-row gap-[15px] mb-[20px] md:mb-[30px] w-full md:w-auto justify-center">
            {/* Green card */}
            <Link href="/checklist/new" data-testid="link-new-checklist" className="flex-1 md:flex-none">
              <motion.div
                whileTap={{ scale: 0.97 }}
                className="flex flex-col items-center justify-center cursor-pointer w-full md:w-[220px] md:h-[220px] h-[170px]"
                style={{
                  background: '#006341',
                  borderRadius: '20px',
                  gap: '14px',
                  padding: '13px 20px',
                  boxSizing: 'border-box',
                }}
              >
                <ClipboardCheck className="md:w-[40px] md:h-[40px] w-8 h-8" style={{ color: '#FFFFFF' }} strokeWidth={2} />
                <div className="flex flex-col items-center" style={{ gap: '3px' }}>
                  <p className="md:text-[28px] md:leading-[33px] text-[20px] leading-[26px] text-center text-white font-bold" style={{ fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif", letterSpacing: '-0.04em', margin: 0 }}>새 점검 등록</p>
                  <p className="md:text-[18px] md:leading-[21px] text-[13px] leading-[17px] text-center text-white" style={{ fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif", fontWeight: 500, letterSpacing: '-0.04em', margin: 0 }}>현장 점검 시작하기</p>
                </div>
              </motion.div>
            </Link>

            {/* White card */}
            <Link href="/staff-dashboard" data-testid="link-staff-dashboard" className="flex-1 md:flex-none">
              <motion.div
                whileTap={{ scale: 0.97 }}
                className="flex flex-col items-center justify-center cursor-pointer w-full md:w-[220px] md:h-[220px] h-[170px]"
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  gap: '14px',
                  padding: '13px 20px',
                  boxSizing: 'border-box',
                  filter: 'drop-shadow(0px 0px 6px rgba(0,0,0,0.25))',
                }}
              >
                <ClipboardList className="md:w-[40px] md:h-[40px] w-8 h-8" style={{ color: '#006341' }} strokeWidth={2} />
                <div className="flex flex-col items-center" style={{ gap: '3px' }}>
                  <p className="md:text-[28px] md:leading-[33px] text-[20px] leading-[26px] text-center font-bold" style={{ fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif", letterSpacing: '-0.04em', color: '#006341', margin: 0 }}>점검 월별<br className="md:hidden" /> 피드백</p>
                  <p className="md:text-[18px] md:leading-[21px] text-[13px] leading-[17px] text-center" style={{ fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif", fontWeight: 500, letterSpacing: '-0.04em', color: '#000000', margin: 0 }}>수정 및 삭제 가능</p>
                </div>
              </motion.div>
            </Link>
          </div>

          {/* Guide button */}
          <Link href="/guides" className="w-full md:w-[455px] block mb-3">
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center md:h-[70px] h-[56px] md:text-[26px] text-[20px]"
              style={{
                background: '#006341',
                borderRadius: '15px',
                cursor: 'pointer',
                fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
                fontWeight: 600,
                lineHeight: '31px',
                letterSpacing: '-0.04em',
                color: '#FFFFFF',
              }}
              data-testid="btn-open-guide"
            >
              매장 가이드 보기
            </motion.div>
          </Link>

          {/* Manual button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setManualOpen(true)}
            className="w-full md:w-[455px] md:h-[70px] h-[56px] md:text-[26px] text-[20px]"
            style={{
              background: '#EAEAEA',
              borderRadius: '15px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
              fontWeight: 600,
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
        className="text-center hidden md:block"
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

      {/* ── Bottom Nav Bar — mobile only ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-center justify-around"
        style={{ height: '56px', boxShadow: '0 -1px 6px rgba(0,0,0,0.07)' }}
      >
        <button
          disabled
          className="flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-xl transition-colors opacity-30"
          data-testid="btn-nav-back"
          aria-label="뒤로 가기"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600" />
          <span className="text-[10px] text-gray-500">뒤로</span>
        </button>

        <button
          onClick={() => window.history.forward()}
          className="flex flex-col items-center justify-center gap-0.5 w-14 h-14 active:bg-gray-100 rounded-xl transition-colors"
          data-testid="btn-nav-forward"
          aria-label="앞으로 가기"
        >
          <ChevronRight className="w-6 h-6 text-gray-600" />
          <span className="text-[10px] text-gray-500">앞으로</span>
        </button>

        <Link href="/">
          <button
            className="flex flex-col items-center justify-center gap-0.5 w-14 h-14 active:bg-gray-100 rounded-xl transition-colors"
            data-testid="btn-nav-home"
            aria-label="홈으로"
          >
            <HomeIcon className="w-6 h-6 text-gray-600" />
            <span className="text-[10px] text-gray-500">홈</span>
          </button>
        </Link>

        <button
          onClick={() => window.location.reload()}
          className="flex flex-col items-center justify-center gap-0.5 w-14 h-14 active:bg-gray-100 rounded-xl transition-colors"
          data-testid="btn-nav-reload"
          aria-label="새로고침"
        >
          <RotateCcw className="w-6 h-6 text-gray-600" />
          <span className="text-[10px] text-gray-500">새로고침</span>
        </button>
      </nav>

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
