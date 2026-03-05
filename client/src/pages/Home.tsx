import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import {
  ClipboardCheck, ClipboardList, ChevronRight, Store, Settings,
  BookOpen, X, Camera, Bell, MessageSquare, BarChart3, CheckCircle2,
  Droplets, ClipboardPen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MANUAL_SECTIONS = [
  {
    role: '현장 직원 — VM 점검',
    color: 'bg-primary/10 text-primary',
    icon: ClipboardPen,
    steps: [
      { icon: ClipboardCheck, text: '메인화면에서 새 점검 등록 선택' },
      { icon: ClipboardCheck, text: '카테고리(농산/수산 등)와 상품 선택' },
      { icon: CheckCircle2, text: '항목별 우수 / 보통 / 미흡 선택' },
      { icon: Camera, text: '현장 사진 첨부 후 제출' },
    ],
  },
  {
    role: '현장 직원 — 청소 점검',
    color: 'bg-emerald-100 text-emerald-700',
    icon: Droplets,
    steps: [
      { icon: ClipboardCheck, text: '새 점검 등록 → 청소 점검 선택' },
      { icon: CheckCircle2, text: '구역(농산/수산 등)과 오픈/마감 선택' },
      { icon: CheckCircle2, text: '항목별 정상 / 문제 체크 후 제출' },
      { icon: ClipboardList, text: '임시저장 가능 (매일 자정 자동 초기화)' },
    ],
  },
  {
    role: '현장 직원 — 알림 확인',
    color: 'bg-amber-100 text-amber-700',
    icon: Bell,
    steps: [
      { icon: Bell, text: '내 점검 목록 → 벨 아이콘으로 알림 확인' },
      { icon: MessageSquare, text: '코멘트/답글 탭: 관리자 피드백 확인' },
      { icon: BarChart3, text: '점수 변경 탭: 관리자 점수 수정 내역' },
      { icon: ChevronRight, text: '알림 탭하면 해당 카드로 바로 이동' },
    ],
  },
  {
    role: '관리자 — 대시보드',
    color: 'bg-slate-100 text-slate-700',
    icon: BarChart3,
    steps: [
      { icon: Settings, text: '관리자 메뉴 → 비밀번호 입력' },
      { icon: BarChart3, text: 'VM / 청소 탭에서 지점별 점검 현황 확인' },
      { icon: MessageSquare, text: '카드에 코멘트 작성 또는 답글로 소통' },
      { icon: CheckCircle2, text: '항목 점수 직접 수정 가능' },
    ],
  },
];

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
                  <h2 className="text-2xl font-bold">내 점검 목록</h2>
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

      {/* 매뉴얼 모달 */}
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
              className="w-full bg-white rounded-t-3xl max-h-[88vh] flex flex-col"
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

              {/* 내용 */}
              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5 pb-8">
                {MANUAL_SECTIONS.map((section) => {
                  const SectionIcon = section.icon;
                  return (
                    <div key={section.role} className="rounded-2xl border border-border/60 overflow-hidden">
                      {/* 섹션 헤더 */}
                      <div className={`flex items-center gap-2 px-4 py-3 ${section.color} bg-opacity-60`}>
                        <SectionIcon className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-black">{section.role}</span>
                      </div>
                      {/* 스텝 목록 */}
                      <div className="divide-y divide-border/40">
                        {section.steps.map((step, i) => {
                          const StepIcon = step.icon;
                          return (
                            <div key={i} className="flex items-start gap-3 px-4 py-3">
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-[10px] font-black text-muted-foreground">{i + 1}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-1">
                                <StepIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-secondary font-medium leading-snug">{step.text}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
