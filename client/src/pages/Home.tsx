import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { ClipboardCheck, ClipboardList, ChevronRight, Store, Settings } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
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
          {/* 현장 직원용 */}
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

          {/* VMD 관리자 전용 */}
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
        </div>
      </div>
    </Layout>
  );
}
