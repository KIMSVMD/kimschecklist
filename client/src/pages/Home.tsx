import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import {
  ClipboardCheck, ClipboardList, ChevronRight, Store, Settings,
  BookOpen, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MANUAL_SECTIONS = [
  {
    id: 'home',
    title: '① 메인 화면',
    subtitle: '앱 시작 및 메뉴 선택',
    steps: [
      '새 점검 등록 → VM 체크리스트 작성 시작',
      '점검 월별 피드백 → 내가 올린 점검 확인/수정',
      '관리자 메뉴 → 비밀번호 입력 후 대시보드',
    ],
  },
  {
    id: 'vm',
    title: '② VM/광고 점검 등록',
    subtitle: 'VM/광고 체크리스트 작성 방법',
    steps: [
      '지점명 선택 후 카테고리(농산/수산 등) 선택',
      '가이드 상품 목록에서 점검할 상품 선택',
      '항목별 우수 / 보통 / 미흡 선택',
      '현장 사진 첨부 후 제출 버튼 클릭',
    ],
  },
  {
    id: 'staff',
    title: '③ 점검 월별 피드백',
    subtitle: '등록한 점검 확인 및 알림',
    steps: [
      '지점 선택 후 날짜별 점검 카드 확인',
      '벨 아이콘으로 관리자 코멘트/점수 알림 확인',
      '카드에서 직접 답글 작성 가능',
      '점검 카드 수정 · 삭제 버튼 사용 가능',
    ],
  },
  {
    id: 'cleaning',
    title: '④ 청소 점검 등록',
    subtitle: '구역별 청소 상태 점검',
    steps: [
      '지점 선택 → 구역(농산/수산 등) 선택',
      '오픈 / 마감 중 해당 시간대 선택',
      '항목별 정상 / 문제 선택 후 제출',
      '임시저장 가능 (매일 자정 자동 초기화)',
    ],
  },
  {
    id: 'admin',
    title: '⑤ 관리자 대시보드',
    subtitle: '전 지점 점검 현황 관리',
    steps: [
      'VM/광고 점검 / 청소 점검 탭으로 구분 확인',
      '지점별 점수 및 항목 현황 카드 확인',
      '코멘트 작성 또는 빠른 템플릿 버튼 사용',
      '항목 점수 직접 수정 가능',
    ],
  },
];

function ManualSection({ section }: { section: typeof MANUAL_SECTIONS[0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden bg-white">
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-muted/50"
        onClick={() => setExpanded(v => !v)}
      >
        <div>
          <p className="text-sm font-black text-secondary">{section.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{section.subtitle}</p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
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
            <div className="border-t border-border/40">
              <div className="px-4 py-3 space-y-2">
                {section.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-secondary leading-snug">{step}</p>
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
    <Layout title="KIMS CLUB" showBack={false}>
      <div className="flex flex-col p-6 space-y-8 h-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-8"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-black text-secondary leading-tight">
            디지털 VM<br />
            <span className="text-primary">체크리스트</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            모바일 현장 점검 및 VMD 관리 시스템
          </p>
        </motion.div>

        <div className="flex flex-col gap-4 mt-auto pb-8">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">현장 직원</p>

          <Link href="/checklist/new" className="block w-full">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-br from-primary to-primary/90 text-white rounded-3xl p-6 shadow-xl shadow-primary/25 border border-primary/20 flex items-center justify-between"
              data-testid="link-new-checklist"
            >
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                  <ClipboardCheck className="w-8 h-8" />
                </div>
                <div className="text-left">
                  <h2 className="text-2xl font-bold">새 점검 등록</h2>
                  <p className="text-primary-foreground/80 font-medium mt-1">현장 점검 시작하기</p>
                </div>
              </div>
              <ChevronRight className="w-8 h-8 opacity-70" />
            </motion.div>
          </Link>

          <Link href="/staff-dashboard" className="block w-full">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-white text-secondary rounded-3xl p-6 shadow-lg shadow-black/5 border-2 border-border flex items-center justify-between"
              data-testid="link-staff-dashboard"
            >
              <div className="flex items-center gap-4">
                <div className="bg-muted p-4 rounded-2xl">
                  <ClipboardList className="w-8 h-8 text-secondary" />
                </div>
                <div className="text-left">
                  <h2 className="text-2xl font-bold">점검 월별 피드백</h2>
                  <p className="text-muted-foreground font-medium mt-1">수정 및 삭제 가능</p>
                </div>
              </div>
              <ChevronRight className="w-8 h-8 text-muted-foreground" />
            </motion.div>
          </Link>

          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 mt-2">VMD 관리자</p>

          <Link href="/admin/login" className="block w-full">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-muted text-secondary rounded-3xl p-5 border-2 border-border flex items-center justify-between"
              data-testid="link-admin"
            >
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-2xl">
                  <Settings className="w-6 h-6 text-secondary" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold">관리자 메뉴</h2>
                  <p className="text-muted-foreground text-sm font-medium mt-0.5">진열 가이드 · 대시보드</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-muted-foreground" />
            </motion.div>
          </Link>

          {/* 사용 매뉴얼 버튼 */}
          <button
            onClick={() => setManualOpen(true)}
            className="flex items-center justify-center gap-2 mt-2 py-2.5 rounded-2xl border border-border bg-white text-muted-foreground text-sm font-bold hover:text-primary hover:border-primary transition-all active:scale-95"
            data-testid="btn-open-manual"
          >
            <BookOpen className="w-4 h-4" />
            사용 매뉴얼 보기
          </button>
        </div>
      </div>

      {/* 매뉴얼 바텀 시트 */}
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
              {/* 헤더 */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 shrink-0">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <span className="text-lg font-black text-secondary">사용 매뉴얼</span>
                </div>
                <button
                  onClick={() => setManualOpen(false)}
                  className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95"
                  data-testid="btn-close-manual"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <p className="px-6 pt-4 pb-2 text-xs text-muted-foreground">
                각 항목을 탭하면 실제 화면과 함께 자세한 설명을 볼 수 있어요.
              </p>

              {/* 섹션 목록 */}
              <div className="overflow-y-auto flex-1 px-6 py-2 space-y-3 pb-8">
                {MANUAL_SECTIONS.map(section => (
                  <ManualSection key={section.id} section={section} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
