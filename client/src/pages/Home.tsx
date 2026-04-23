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

      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-gray-200">
        <img src={logoKimsClub} alt="KIM'S CLUB" className="h-6 object-contain" />
        <Link href="/admin/login">
          <button
            className="bg-gray-900 text-white font-bold text-sm px-5 py-2.5 rounded-full active:scale-95 transition-transform tracking-tight"
            data-testid="btn-admin-mode"
          >
            관리자 모드
          </button>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex flex-col items-center justify-center flex-1 px-8 py-12">
        <div className="w-full max-w-[380px] mx-auto flex flex-col items-center gap-10">

          {/* Title */}
          <div className="text-center">
            <h1
              className="text-5xl text-gray-900 leading-tight whitespace-nowrap"
              style={{ fontFamily: "'Black Han Sans', 'Noto Sans KR', sans-serif" }}
            >
              매장 점검{' '}
              <span className="text-green-800">체크리스트</span>
            </h1>
            <p className="mt-3 text-gray-400 text-sm tracking-wide">
              현장 점검 · 진열 · 품질 관리 시스템
            </p>
          </div>

          {/* Two menu cards */}
          <div className="grid grid-cols-2 gap-4 w-full">
            <Link href="/checklist/new" className="block" data-testid="link-new-checklist">
              <motion.div
                whileTap={{ scale: 0.97 }}
                className="bg-green-800 text-white rounded-2xl flex flex-col items-center justify-center gap-4 aspect-square cursor-pointer"
              >
                <ClipboardCheck className="w-10 h-10" strokeWidth={1.5} />
                <div className="text-center">
                  <p className="font-black text-base leading-tight" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>새 점검 등록</p>
                  <p className="text-green-300 text-xs mt-1">현장 점검 시작하기</p>
                </div>
              </motion.div>
            </Link>

            <Link href="/staff-dashboard" className="block" data-testid="link-staff-dashboard">
              <motion.div
                whileTap={{ scale: 0.97 }}
                className="bg-white border border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-4 aspect-square cursor-pointer"
              >
                <ClipboardList className="w-10 h-10 text-gray-600" strokeWidth={1.5} />
                <div className="text-center">
                  <p className="font-black text-base text-gray-900 leading-tight" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>점검 월별 피드백</p>
                  <p className="text-gray-400 text-xs mt-1">수정 및 삭제 가능</p>
                </div>
              </motion.div>
            </Link>
          </div>

          {/* Manual button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setManualOpen(true)}
            className="w-full bg-gray-100 text-gray-800 font-bold py-4 rounded-2xl text-base active:bg-gray-200 transition-colors tracking-tight"
            style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
            data-testid="btn-open-manual"
          >
            사용 매뉴얼 보기
          </motion.button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-gray-400 tracking-wide">
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
