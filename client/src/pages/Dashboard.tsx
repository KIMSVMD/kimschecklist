import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useChecklists, useDeleteChecklist, useUpdateChecklistItemStatus, useUpdateChecklistScore, useUpdateChecklistAdScore, useUpdateChecklistQualityScore } from "@/hooks/use-checklists";
import { useAdminStatus, useValidGuideProducts } from "@/hooks/use-guides";
import { useCleaningInspections, useDeleteCleaning, useUpdateCleaningItemStatus } from "@/hooks/use-cleaning";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { calcCleaningScore, scoreColor, getGrade, gradeColor } from "@/lib/scoring";
import {
  Filter, Image as ImageIcon, AlertCircle, Pencil, Trash2, Loader2,
  CheckCircle2, XCircle, BarChart3, Droplets, Sun, Moon,
  MessageSquare, Send, CheckCheck, CornerDownRight,
  ChevronLeft, ChevronRight, Calendar, Bell, Star,
  ClipboardList, UploadCloud, Reply, Clock, Trophy,
} from "lucide-react";
import { PhotoThumbnail } from "@/components/PhotoLightbox";
import { VMCommentThread } from "@/components/VMCommentThread";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useSaveChecklistComment } from "@/hooks/use-checklists";
import { useSaveCleaningComment } from "@/hooks/use-cleaning";
import { CleaningCommentThread } from "@/components/CleaningCommentThread";
import { useAdminNotifications } from "@/hooks/use-notifications";
import { NotificationPanel } from "@/components/NotificationPanel";

const CATEGORIES = ['전체', '농산', '수산', '축산', '공산'];
const BRANCHES = ['전체', '강남', '강서', '야탑', '불광', '송파', '부천', '평촌', '분당', '신구로', '구의', '유성', '일산', '수성', '광명', '쇼핑', '해운대', '산본', '동수원', '괴정', '부산대', '인천', '안양', '고잔', '중계', '김포', '강북', '청주'];
const ZONES = ['입구', '농산', '축산', '수산', '공산'];

function AdminCommentInput({ 
  id, type, existingComment, confirmed, staffReply
}: { 
  id: number; type: 'vm' | 'cleaning'; existingComment?: string | null; confirmed?: boolean | null; staffReply?: string | null;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(existingComment ?? '');
  const vmMutation = useSaveChecklistComment();
  const cleaningMutation = useSaveCleaningComment();
  const saveMutation = type === 'vm' ? vmMutation : cleaningMutation;

  const handleSave = async (overrideText?: string) => {
    const comment = overrideText ?? text;
    try {
      await (saveMutation as any).mutateAsync({ id, adminComment: comment });
      toast({ title: "코멘트 저장됨", description: "현장 직원에게 전달됩니다." });
      setOpen(false);
    } catch {
      toast({ title: "저장 실패", variant: "destructive" });
    }
  };

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      {!open ? (
        <button
          onClick={() => { setText(existingComment ?? ''); setOpen(true); }}
          className={`w-full flex items-center justify-between py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
            existingComment
              ? 'bg-amber-50 border border-amber-200 text-amber-700'
              : 'bg-muted text-muted-foreground hover:text-secondary'
          }`}
          data-testid={`btn-comment-open-${id}`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            {existingComment ? (
              <span className="truncate max-w-[200px]">{existingComment}</span>
            ) : (
              <span>관리자 코멘트 추가</span>
            )}
          </div>
          {confirmed && <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0" />}
        </button>
      ) : (
        <div className="space-y-2">
          {type === 'cleaning' && (
            <div className="flex flex-wrap gap-1.5">
              {[
                '점검 후 사진 전송 부탁드립니다',
                '확인 부탁드립니다',
              ].map(tpl => (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => handleSave(tpl)}
                  disabled={saveMutation.isPending}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-border bg-muted text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50"
                  data-testid={`btn-comment-tpl-${id}-${tpl}`}
                >
                  {tpl}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="현장 직원에게 전달할 피드백을 입력하세요..."
            className="w-full rounded-xl border border-border bg-muted/50 p-3 text-sm text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            rows={3}
            autoFocus
            data-testid={`input-comment-${id}`}
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleSave()}
              disabled={saveMutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              data-testid={`btn-comment-save-${id}`}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              저장
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-muted text-muted-foreground font-bold text-sm active:scale-[0.98]"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Staff reply — shown to admin as read-only (VM only; cleaning uses thread) */}
      {type === 'vm' && staffReply && (
        <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex gap-2">
          <CornerDownRight className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-0.5">현장직원 답글</p>
            <p className="text-sm text-secondary">{staffReply}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminScoreInput({
  id, existingScore, staffItems, existingAdminItems
}: {
  id: number;
  existingScore?: number | null;
  staffItems: Record<string, string>;
  existingAdminItems?: Record<string, 'ok' | 'notok'> | null;
}) {
  const { toast } = useToast();
  const scoreMutation = useUpdateChecklistScore();
  const [open, setOpen] = useState(existingScore == null);
  const [manualScore, setManualScore] = useState<string>(existingScore != null ? String(existingScore) : '');
  const itemKeys = Object.keys(staffItems);
  const totalItems = itemKeys.length;

  const initSel = () => Object.fromEntries(
    itemKeys.map(k => {
      if (existingAdminItems?.[k]) return [k, existingAdminItems[k]];
      const sv = staffItems[k];
      return [k, (sv === 'ok' || sv === 'excellent') ? 'ok' : 'notok'];
    })
  );

  const [adminSel, setAdminSel] = useState<Record<string, 'ok' | 'notok'>>(initSel);

  const okCount = Object.values(adminSel).filter(v => v === 'ok').length;
  const calcScore = () => totalItems > 0 ? Math.round((okCount / totalItems) * 100) : 0;

  const scoreColorClass = (s: number) =>
    s >= 90 ? 'text-blue-600 bg-blue-50 border-blue-300' :
    s >= 70 ? 'text-amber-600 bg-amber-50 border-amber-300' :
    'text-primary bg-red-50 border-red-300';

  const handleSave = async () => {
    const score = calcScore();
    try {
      await scoreMutation.mutateAsync({ id, adminScore: score, adminItems: adminSel });
      toast({ title: `○ ${okCount}/${totalItems} → ${score}점 확정` });
      setOpen(false);
    } catch {
      toast({ title: "저장 실패", variant: "destructive" });
    }
  };

  const score = existingScore != null ? existingScore : null;
  const confirmedOk = existingAdminItems ? Object.values(existingAdminItems).filter(v => v === 'ok').length : null;

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      {/* Header trigger */}
      <button
        onClick={() => { if (!open) setAdminSel(initSel()); setOpen(o => !o); }}
        className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
          score != null ? `${scoreColorClass(score)} border` : 'bg-muted text-muted-foreground hover:text-secondary'
        }`}
        data-testid={`btn-score-open-${id}`}
      >
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4" />
          {score != null
            ? <span>○ {confirmedOk}/{totalItems} → {score}점 {open ? '(수정 중)' : '(확정)'}</span>
            : <span>관리자 평가 (항목 수정 후 확정)</span>}
        </div>
        <span className="text-[11px] opacity-50">{open ? '▲' : '▼'}</span>
      </button>

      {/* Compact per-item grid */}
      {open && totalItems > 0 && (
        <div className="mt-2 space-y-1">
          {/* Live score bar */}
          <div className={`flex items-center justify-between px-3 py-2 rounded-xl border font-bold text-sm mb-2 ${scoreColorClass(calcScore())}`}>
            <span>○ {okCount}개 / {totalItems}개</span>
            <span className="text-lg font-black">{calcScore()}점</span>
          </div>

          {itemKeys.map(key => {
            const staffVal = staffItems[key];
            const isStaffOk = staffVal === 'ok' || staffVal === 'excellent';
            const adminVal = adminSel[key];
            return (
              <div key={key} className="flex items-center gap-2 py-1.5 px-2 rounded-xl bg-muted/30 border border-border/40">
                {/* Staff mark */}
                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border ${
                  isStaffOk ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-red-50 border-red-200 text-primary'
                }`}>
                  {isStaffOk ? '○' : '✗'}
                </span>
                {/* Item name */}
                <span className="flex-1 text-xs font-medium text-secondary leading-snug min-w-0">{key}</span>
                {/* Admin toggle buttons */}
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setAdminSel(s => ({ ...s, [key]: 'ok' }))}
                    className={`w-9 h-8 rounded-lg border-2 font-black text-sm flex items-center justify-center transition-all active:scale-90 ${
                      adminVal === 'ok'
                        ? 'bg-blue-500 border-blue-600 text-white'
                        : 'bg-white border-border text-muted-foreground hover:border-blue-300 hover:text-blue-500'
                    }`}
                    data-testid={`btn-admin-ok-${id}-${key}`}
                  >○</button>
                  <button
                    onClick={() => setAdminSel(s => ({ ...s, [key]: 'notok' }))}
                    className={`w-9 h-8 rounded-lg border-2 font-black text-sm flex items-center justify-center transition-all active:scale-90 ${
                      adminVal === 'notok'
                        ? 'bg-primary border-red-700 text-white'
                        : 'bg-white border-border text-muted-foreground hover:border-red-300 hover:text-primary'
                    }`}
                    data-testid={`btn-admin-notok-${id}-${key}`}
                  >✗</button>
                </div>
              </div>
            );
          })}

          {/* Confirm row */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={scoreMutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white font-black text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
              data-testid={`btn-score-save-${id}`}
            >
              {scoreMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
              {calcScore()}점으로 확정
            </button>
            <button onClick={() => setOpen(false)}
              className="px-3 py-2.5 rounded-xl bg-muted text-muted-foreground font-bold text-sm active:scale-[0.98]">
              취소
            </button>
          </div>
        </div>
      )}

      {open && totalItems === 0 && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground px-1">항목이 없는 가이드입니다. 사진 확인 후 직접 점수를 입력하세요.</p>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={0}
              max={100}
              value={manualScore}
              onChange={e => setManualScore(e.target.value)}
              placeholder="0–100"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-border text-base font-bold focus:outline-none focus:border-primary text-center"
              data-testid={`input-manual-score-${id}`}
            />
            <span className="font-bold text-muted-foreground text-lg">점</span>
            <button
              onClick={async () => {
                const s = Math.min(100, Math.max(0, parseInt(manualScore) || 0));
                try {
                  await scoreMutation.mutateAsync({ id, adminScore: s, adminItems: {} });
                  toast({ title: `${s}점으로 확정` });
                  setOpen(false);
                } catch {
                  toast({ title: "저장 실패", variant: "destructive" });
                }
              }}
              disabled={scoreMutation.isPending || manualScore === ''}
              className="px-4 py-3 rounded-xl bg-primary text-white font-black text-sm flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
              data-testid={`btn-manual-score-save-${id}`}
            >
              {scoreMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
              확정
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminAdScoreInput({
  id, existingScore, staffAdItems, existingAdminItems
}: {
  id: number;
  existingScore?: number | null;
  staffAdItems: Record<string, string>;
  existingAdminItems?: Record<string, 'ok' | 'notok'> | null;
}) {
  const { toast } = useToast();
  const adScoreMutation = useUpdateChecklistAdScore();
  const [open, setOpen] = useState(existingScore == null);
  const [manualScore, setManualScore] = useState<string>(existingScore != null ? String(existingScore) : '');
  const itemKeys = Object.keys(staffAdItems);
  const totalItems = itemKeys.length;

  const initSel = () => Object.fromEntries(
    itemKeys.map(k => {
      if (existingAdminItems?.[k]) return [k, existingAdminItems[k]];
      const sv = staffAdItems[k];
      return [k, (sv === 'ok' || sv === 'excellent') ? 'ok' : 'notok'];
    })
  );

  const [adminSel, setAdminSel] = useState<Record<string, 'ok' | 'notok'>>(initSel);
  const okCount = Object.values(adminSel).filter(v => v === 'ok').length;
  const calcScore = () => totalItems > 0 ? Math.round((okCount / totalItems) * 100) : 0;

  const scoreColorClass = (s: number) =>
    s >= 90 ? 'text-amber-600 bg-amber-50 border-amber-300' :
    s >= 70 ? 'text-orange-600 bg-orange-50 border-orange-300' :
    'text-primary bg-red-50 border-red-300';

  const handleSave = async () => {
    const score = calcScore();
    try {
      await adScoreMutation.mutateAsync({ id, adAdminScore: score, adAdminItems: adminSel });
      toast({ title: `광고 ○ ${okCount}/${totalItems} → ${score}점 확정` });
      setOpen(false);
    } catch {
      toast({ title: "저장 실패", variant: "destructive" });
    }
  };

  const score = existingScore != null ? existingScore : null;
  const confirmedOk = existingAdminItems ? Object.values(existingAdminItems).filter(v => v === 'ok').length : null;

  return (
    <div className="mt-3 border-t border-amber-200/60 pt-3">
      <button
        onClick={() => { if (!open) setAdminSel(initSel()); setOpen(o => !o); }}
        className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
          score != null ? `${scoreColorClass(score)} border` : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
        }`}
        data-testid={`btn-ad-score-open-${id}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">📢</span>
          {score != null
            ? <span>광고 ○ {confirmedOk}/{totalItems} → {score}점 {open ? '(수정 중)' : '(확정)'}</span>
            : <span>광고 평가 (항목 확인 후 확정)</span>}
        </div>
        <span className="text-[11px] opacity-50">{open ? '▲' : '▼'}</span>
      </button>

      {open && totalItems > 0 && (
        <div className="mt-2 space-y-1">
          <div className={`flex items-center justify-between px-3 py-2 rounded-xl border font-bold text-sm mb-2 ${scoreColorClass(calcScore())}`}>
            <span>○ {okCount}개 / {totalItems}개</span>
            <span className="text-lg font-black">{calcScore()}점</span>
          </div>
          {itemKeys.map(key => {
            const staffVal = staffAdItems[key];
            const isStaffOk = staffVal === 'ok' || staffVal === 'excellent';
            const adminVal = adminSel[key];
            return (
              <div key={key} className="flex items-center gap-2 py-1.5 px-2 rounded-xl bg-amber-50/40 border border-amber-200/40">
                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border ${
                  isStaffOk ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-red-50 border-red-200 text-primary'
                }`}>
                  {isStaffOk ? '○' : '✗'}
                </span>
                <span className="flex-1 text-xs font-medium text-secondary leading-snug min-w-0">{key}</span>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setAdminSel(s => ({ ...s, [key]: 'ok' }))}
                    className={`w-9 h-8 rounded-lg border-2 font-black text-sm flex items-center justify-center transition-all active:scale-90 ${
                      adminVal === 'ok' ? 'bg-amber-500 border-amber-600 text-white' : 'bg-white border-border text-muted-foreground hover:border-amber-300 hover:text-amber-500'
                    }`}
                    data-testid={`btn-admin-ad-ok-${id}-${key}`}
                  >○</button>
                  <button
                    onClick={() => setAdminSel(s => ({ ...s, [key]: 'notok' }))}
                    className={`w-9 h-8 rounded-lg border-2 font-black text-sm flex items-center justify-center transition-all active:scale-90 ${
                      adminVal === 'notok' ? 'bg-primary border-red-700 text-white' : 'bg-white border-border text-muted-foreground hover:border-red-300 hover:text-primary'
                    }`}
                    data-testid={`btn-admin-ad-notok-${id}-${key}`}
                  >✗</button>
                </div>
              </div>
            );
          })}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={adScoreMutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
              data-testid={`btn-ad-score-save-${id}`}
            >
              {adScoreMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>📢</span>}
              광고 {calcScore()}점으로 확정
            </button>
            <button onClick={() => setOpen(false)}
              className="px-3 py-2.5 rounded-xl bg-muted text-muted-foreground font-bold text-sm active:scale-[0.98]">
              취소
            </button>
          </div>
        </div>
      )}

      {open && totalItems === 0 && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground px-1">항목이 없는 광고 가이드입니다. 사진 확인 후 직접 점수를 입력하세요.</p>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={0}
              max={100}
              value={manualScore}
              onChange={e => setManualScore(e.target.value)}
              placeholder="0–100"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-amber-200 text-base font-bold focus:outline-none focus:border-amber-400 text-center bg-amber-50"
              data-testid={`input-manual-ad-score-${id}`}
            />
            <span className="font-bold text-muted-foreground text-lg">점</span>
            <button
              onClick={async () => {
                const s = Math.min(100, Math.max(0, parseInt(manualScore) || 0));
                try {
                  await adScoreMutation.mutateAsync({ id, adAdminScore: s, adAdminItems: {} });
                  toast({ title: `광고 ${s}점으로 확정` });
                  setOpen(false);
                } catch {
                  toast({ title: "저장 실패", variant: "destructive" });
                }
              }}
              disabled={adScoreMutation.isPending || manualScore === ''}
              className="px-4 py-3 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
              data-testid={`btn-manual-ad-score-save-${id}`}
            >
              {adScoreMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>📢</span>}
              확정
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminQualityScoreInput({
  id, existingScore, staffQualityItems, existingAdminItems
}: {
  id: number;
  existingScore?: number | null;
  staffQualityItems: Record<string, string>;
  existingAdminItems?: Record<string, 'ok' | 'notok'> | null;
}) {
  const { toast } = useToast();
  const qualityScoreMutation = useUpdateChecklistQualityScore();
  const [open, setOpen] = useState(existingScore == null);
  const [manualScore, setManualScore] = useState<string>(existingScore != null ? String(existingScore) : '');
  const itemKeys = Object.keys(staffQualityItems);
  const totalItems = itemKeys.length;

  const initSel = () => Object.fromEntries(
    itemKeys.map(k => {
      if (existingAdminItems?.[k]) return [k, existingAdminItems[k]];
      const sv = staffQualityItems[k];
      return [k, (sv === 'ok' || sv === 'excellent') ? 'ok' : 'notok'];
    })
  );

  const [adminSel, setAdminSel] = useState<Record<string, 'ok' | 'notok'>>(initSel);
  const okCount = Object.values(adminSel).filter(v => v === 'ok').length;
  const calcScore = () => totalItems > 0 ? Math.round((okCount / totalItems) * 100) : 0;

  const scoreColorClass = (s: number) =>
    s >= 90 ? 'text-purple-700 bg-purple-50 border-purple-300' :
    s >= 70 ? 'text-purple-600 bg-purple-50 border-purple-200' :
    'text-primary bg-red-50 border-red-300';

  const handleSave = async () => {
    const score = calcScore();
    try {
      await qualityScoreMutation.mutateAsync({ id, qualityAdminScore: score, qualityAdminItems: adminSel });
      toast({ title: `품질 ○ ${okCount}/${totalItems} → ${score}점 확정` });
      setOpen(false);
    } catch {
      toast({ title: "저장 실패", variant: "destructive" });
    }
  };

  const score = existingScore != null ? existingScore : null;
  const confirmedOk = existingAdminItems ? Object.values(existingAdminItems).filter(v => v === 'ok').length : null;

  return (
    <div className="mt-3 border-t border-purple-200/60 pt-3">
      <button
        onClick={() => { if (!open) setAdminSel(initSel()); setOpen(o => !o); }}
        className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
          score != null ? `${scoreColorClass(score)} border` : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
        }`}
        data-testid={`btn-quality-score-open-${id}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">⭐</span>
          {score != null
            ? <span>품질 ○ {confirmedOk}/{totalItems} → {score}점 {open ? '(수정 중)' : '(확정)'}</span>
            : <span>품질 평가 (항목 확인 후 확정)</span>}
        </div>
        <span className="text-[11px] opacity-50">{open ? '▲' : '▼'}</span>
      </button>

      {open && totalItems > 0 && (
        <div className="mt-2 space-y-1">
          <div className={`flex items-center justify-between px-3 py-2 rounded-xl border font-bold text-sm mb-2 ${scoreColorClass(calcScore())}`}>
            <span>○ {okCount}개 / {totalItems}개</span>
            <span className="text-lg font-black">{calcScore()}점</span>
          </div>
          {itemKeys.map(key => {
            const staffVal = staffQualityItems[key];
            const isStaffOk = staffVal === 'ok' || staffVal === 'excellent';
            const adminVal = adminSel[key];
            return (
              <div key={key} className="flex items-center gap-2 py-1.5 px-2 rounded-xl bg-purple-50/40 border border-purple-200/40">
                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border ${
                  isStaffOk ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-red-50 border-red-200 text-primary'
                }`}>
                  {isStaffOk ? '○' : '✗'}
                </span>
                <span className="flex-1 text-xs font-medium text-secondary leading-snug min-w-0">{key}</span>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setAdminSel(s => ({ ...s, [key]: 'ok' }))}
                    className={`w-9 h-8 rounded-lg border-2 font-black text-sm flex items-center justify-center transition-all active:scale-90 ${
                      adminVal === 'ok' ? 'bg-purple-600 border-purple-700 text-white' : 'bg-white border-border text-muted-foreground hover:border-purple-300 hover:text-purple-600'
                    }`}
                    data-testid={`btn-admin-quality-ok-${id}-${key}`}
                  >○</button>
                  <button
                    onClick={() => setAdminSel(s => ({ ...s, [key]: 'notok' }))}
                    className={`w-9 h-8 rounded-lg border-2 font-black text-sm flex items-center justify-center transition-all active:scale-90 ${
                      adminVal === 'notok' ? 'bg-primary border-red-700 text-white' : 'bg-white border-border text-muted-foreground hover:border-red-300 hover:text-primary'
                    }`}
                    data-testid={`btn-admin-quality-notok-${id}-${key}`}
                  >✗</button>
                </div>
              </div>
            );
          })}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={qualityScoreMutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-black text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
              data-testid={`btn-quality-score-save-${id}`}
            >
              {qualityScoreMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>⭐</span>}
              품질 {calcScore()}점으로 확정
            </button>
            <button onClick={() => setOpen(false)}
              className="px-3 py-2.5 rounded-xl bg-muted text-muted-foreground font-bold text-sm active:scale-[0.98]">
              취소
            </button>
          </div>
        </div>
      )}

      {open && totalItems === 0 && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground px-1">항목이 없는 품질 가이드입니다. 사진 확인 후 직접 점수를 입력하세요.</p>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={0}
              max={100}
              value={manualScore}
              onChange={e => setManualScore(e.target.value)}
              placeholder="0–100"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-purple-200 text-base font-bold focus:outline-none focus:border-purple-400 text-center bg-purple-50"
              data-testid={`input-manual-quality-score-${id}`}
            />
            <span className="font-bold text-muted-foreground text-lg">점</span>
            <button
              onClick={async () => {
                const s = Math.min(100, Math.max(0, parseInt(manualScore) || 0));
                try {
                  await qualityScoreMutation.mutateAsync({ id, qualityAdminScore: s, qualityAdminItems: {} });
                  toast({ title: `품질 ${s}점으로 확정` });
                  setOpen(false);
                } catch {
                  toast({ title: "저장 실패", variant: "destructive" });
                }
              }}
              disabled={qualityScoreMutation.isPending || manualScore === ''}
              className="px-4 py-3 rounded-xl bg-purple-600 text-white font-black text-sm flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
              data-testid={`btn-manual-quality-score-save-${id}`}
            >
              {qualityScoreMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>⭐</span>}
              확정
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function VMTab({ highlightId, highlightBranch }: { highlightId?: number; highlightBranch?: string }) {
  const now = new Date();
  const [filterBranch, setFilterBranch] = useState('전체');
  const [filterCategory, setFilterCategory] = useState('전체');
  const [filterProduct, setFilterProduct] = useState('전체');
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [viewFilter, setViewFilter] = useState<'all' | 'vm' | 'ad' | 'quality'>('all');
  const { toast } = useToast();

  const currentYear = now.getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    setFilterProduct('전체');
  }, [filterCategory, filterBranch]);

  useEffect(() => {
    if (!highlightId) return;
    setFilterBranch(highlightBranch ?? '전체');
    setFilterCategory('전체');
    const timer = setTimeout(() => {
      const el = document.getElementById(`vm-card-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2500);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightId, highlightBranch]);

  const deleteMutation = useDeleteChecklist();
  const itemStatusMutation = useUpdateChecklistItemStatus();

  const handleItemToggle = async (id: number, itemName: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ok' ? 'notok' : 'ok';
    try {
      await itemStatusMutation.mutateAsync({ id, itemName, newStatus: nextStatus });
      toast({ title: nextStatus === 'ok' ? "일치로 변경됨" : "불일치로 변경됨" });
    } catch {
      toast({ title: "변경 실패", variant: "destructive" });
    }
  };

  const { data: allChecklists, isLoading } = useChecklists({
    branch: filterBranch !== '전체' ? filterBranch : undefined,
    category: filterCategory !== '전체' ? filterCategory : undefined,
  });

  // 농산 전체 데이터 — 순위 계산용
  const { data: agriAll } = useChecklists({ category: '농산' });
  const { data: validGuideProducts = [] } = useValidGuideProducts(filterYear, filterMonth);

  // 카테고리 내 상품 목록 (날짜 무관, 선택된 카테고리/지점 기준)
  const availableProducts = useMemo(() => {
    const CAT_ORDER = ['농산', '수산', '축산', '공산'];
    const productCatMap = new Map<string, string>();
    (allChecklists ?? []).forEach(item => {
      if (item.product && !productCatMap.has(item.product)) {
        productCatMap.set(item.product, (item as any).category ?? '');
      }
    });
    const sorted = Array.from(productCatMap.keys()).sort((a, b) => {
      const oA = CAT_ORDER.indexOf(productCatMap.get(a) ?? '');
      const oB = CAT_ORDER.indexOf(productCatMap.get(b) ?? '');
      return (oA === -1 ? 99 : oA) - (oB === -1 ? 99 : oB);
    });
    return ['전체', ...sorted];
  }, [allChecklists]);

  // Filter by year/month and product client-side
  const CATEGORY_ORDER = ['농산', '수산', '축산', '공산'];
  const checklists = (allChecklists ?? []).filter(item => {
    const itemYear = (item as any).year;
    const itemMonth = (item as any).month;
    let matchesDate: boolean;
    if (itemYear && itemMonth) {
      matchesDate = itemYear === filterYear && itemMonth === filterMonth;
    } else {
      const d = new Date(item.createdAt);
      matchesDate = d.getFullYear() === filterYear && d.getMonth() + 1 === filterMonth;
    }
    if (!matchesDate) return false;
    if (filterProduct !== '전체' && item.product !== filterProduct) return false;
    const cType = (item as any).checklistType || 'vm';
    if (viewFilter === 'quality') return cType === 'quality';
    if (viewFilter === 'ad') return cType === 'ad';
    if (viewFilter === 'vm') return cType !== 'ad' && cType !== 'quality';
    return true;
  }).sort((a, b) => {
    const guidePriority = (product: string) => {
      if (validGuideProducts.some(g => g.product === product && g.hasDateRange)) return 0;
      if (validGuideProducts.some(g => g.product === product)) return 1;
      return 2;
    };
    const pA = guidePriority(a.product ?? '');
    const pB = guidePriority(b.product ?? '');
    if (pA !== pB) return pA - pB;
    if (filterBranch === '전체') {
      const catA = CATEGORY_ORDER.indexOf((a as any).category ?? '');
      const catB = CATEGORY_ORDER.indexOf((b as any).category ?? '');
      const oA = catA === -1 ? 99 : catA;
      const oB = catB === -1 ? 99 : catB;
      if (oA !== oB) return oA - oB;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // 농산 기준 월별 순위 계산
  const agriPeriod = (agriAll ?? []).filter(item => {
    const itemYear = (item as any).year;
    const itemMonth = (item as any).month;
    if (itemYear && itemMonth) return itemYear === filterYear && itemMonth === filterMonth;
    const d = new Date(item.createdAt);
    return d.getFullYear() === filterYear && d.getMonth() + 1 === filterMonth;
  });

  const vmRanking = (() => {
    const byBranch: Record<string, number[]> = {};
    agriPeriod.forEach(item => {
      if ((item as any).checklistType === 'ad') return;
      const score = (item as any).adminScore as number | null;
      if (score == null) return;
      const br = (item as any).branch as string;
      if (!br) return;
      (byBranch[br] = byBranch[br] ?? []).push(score);
    });
    return Object.entries(byBranch)
      .map(([branch, scores]) => ({ branch, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), count: scores.length }))
      .sort((a, b) => b.avg - a.avg);
  })();

  const adRanking = (() => {
    const byBranch: Record<string, number[]> = {};
    agriPeriod.forEach(item => {
      const score = (item as any).adAdminScore as number | null;
      if (score == null) return;
      const br = (item as any).branch as string;
      if (!br) return;
      (byBranch[br] = byBranch[br] ?? []).push(score);
    });
    return Object.entries(byBranch)
      .map(([branch, scores]) => ({ branch, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), count: scores.length }))
      .sort((a, b) => b.avg - a.avg);
  })();

  const qualityRanking = (() => {
    const byBranch: Record<string, number[]> = {};
    agriPeriod.forEach(item => {
      const score = (item as any).qualityAdminScore as number | null;
      if (score == null) return;
      const br = (item as any).branch as string;
      if (!br) return;
      (byBranch[br] = byBranch[br] ?? []).push(score);
    });
    return Object.entries(byBranch)
      .map(([branch, scores]) => ({ branch, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), count: scores.length }))
      .sort((a, b) => b.avg - a.avg);
  })();

  const showLeaderboard = false;

  const handleDelete = async (id: number, label: string) => {
    if (!confirm(`"${label}" 점검 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "삭제 완료", description: "점검 기록이 삭제되었습니다." });
    } catch {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  };

  return (
    <>
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-border/50 p-4 space-y-3 shadow-sm">
        <div className="flex gap-1.5">
          {([['all', '전체'], ['vm', '진열'], ['ad', '광고(+영상)'], ['quality', '품질']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setViewFilter(val)}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 border-2 ${
                viewFilter === val
                  ? val === 'ad' ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : val === 'quality' ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-muted text-muted-foreground border-transparent'
              }`}
              data-testid={`btn-view-filter-${val}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-secondary font-bold">
          <Filter className="w-5 h-5" />
          <span>필터링</span>
        </div>
        <div className="flex gap-2">
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
            className="flex-1 bg-muted border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary/50 outline-none text-secondary"
            data-testid="select-filter-branch">
            {BRANCHES.map(b => <option key={b} value={b}>{b === '전체' ? '전체 지점' : `${b}점`}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="flex-1 bg-muted border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary/50 outline-none text-secondary"
            data-testid="select-filter-category">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <select
          value={filterProduct}
          onChange={e => setFilterProduct(e.target.value)}
          className="w-full bg-muted border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary/50 outline-none text-secondary"
          data-testid="select-filter-product"
        >
          {availableProducts.map(p => (
            <option key={p} value={p}>{p === '전체' ? '전체 상품' : p}</option>
          ))}
        </select>
        {/* Year/Month filter */}
        <div className="flex gap-2 items-center">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
            className="bg-muted border-none rounded-xl px-3 py-2.5 font-bold text-sm focus:ring-2 focus:ring-primary/50 outline-none text-secondary">
            {yearOptions.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <div className="flex gap-1 overflow-x-auto no-scrollbar flex-1 touch-pan-x">
            {monthOptions.map(m => (
              <button key={m} onClick={() => setFilterMonth(m)}
                className={`shrink-0 px-3 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                  filterMonth === m ? 'bg-primary text-white shadow-sm' : 'bg-muted text-muted-foreground'
                }`}>
                {m}월
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── 지점 순위 리더보드 (지점 미선택 + VM/광고 탭) ── */}
        {showLeaderboard ? (() => {
          const ranking = viewFilter === 'vm' ? vmRanking : viewFilter === 'quality' ? qualityRanking : adRanking;
          const title = viewFilter === 'vm' ? '진열 점수 순위' : viewFilter === 'quality' ? '품질 점수 순위' : '광고(+영상) 점수 순위';
          const accentClass = viewFilter === 'vm' ? 'text-primary' : viewFilter === 'quality' ? 'text-purple-700' : 'text-amber-600';
          const topBg = viewFilter === 'vm' ? 'from-primary/10 to-primary/5 border-primary/20' : viewFilter === 'quality' ? 'from-purple-500/10 to-purple-500/5 border-purple-300/20' : 'from-amber-500/10 to-amber-500/5 border-amber-400/20';
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pt-1 pb-2">
                <Trophy className={`w-5 h-5 ${accentClass}`} />
                <h2 className={`text-base font-black ${accentClass}`}>{filterYear}년 {filterMonth}월 {title}</h2>
                <span className="text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">농산 기준</span>
              </div>
              {ranking.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Trophy className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-medium">이번 달 확정 점수 데이터가 없습니다.</p>
                  <p className="text-sm mt-1">관리자 점수 확정 후 순위가 표시됩니다.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ranking.map(({ branch, avg, count }, idx) => {
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                    const isTop3 = idx < 3;
                    const avgColor = avg >= 90 ? 'text-emerald-600' : avg >= 70 ? 'text-amber-600' : 'text-red-500';
                    return (
                      <button
                        key={branch}
                        onClick={() => setFilterBranch(branch)}
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] text-left ${
                          isTop3
                            ? `bg-gradient-to-r ${topBg} shadow-md`
                            : 'bg-white border-border/50 hover:border-border'
                        }`}
                        data-testid={`btn-rank-${branch}`}
                      >
                        <div className="w-9 text-center shrink-0">
                          {medal
                            ? <span className="text-2xl leading-none">{medal}</span>
                            : <span className="text-base font-black text-muted-foreground">{idx + 1}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-secondary text-base">{branch}점</span>
                          <span className="text-xs text-muted-foreground ml-2">{count}건 평균</span>
                        </div>
                        <div className="flex items-baseline gap-0.5 shrink-0">
                          <span className={`text-2xl font-black ${avgColor}`}>{avg}</span>
                          <span className="text-xs text-muted-foreground font-medium">점</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-center text-xs text-muted-foreground pt-2">지점을 탭하면 해당 지점의 점검 내역을 볼 수 있습니다.</p>
            </div>
          );
        })() : isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            데이터를 불러오는 중...
          </div>
        ) : !checklists.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 opacity-50" />
            </div>
            <p className="font-medium text-lg">{filterYear}년 {filterMonth}월 점검 기록이 없습니다.</p>
          </div>
        ) : (
          checklists.map((item, index) => {
            const hasNotok = item.items && Object.values(item.items as Record<string, string>).some(v => v === 'notok');
            const adminScore = (item as any).adminScore as number | null | undefined;
            const adAdminScore = (item as any).adAdminScore as number | null | undefined;
            const qualityAdminScore = (item as any).qualityAdminScore as number | null | undefined;
            const hasAdItems = !!(((item as any).adItems && Object.keys((item as any).adItems).length > 0) || ((item as any).adPhotoUrls && (item as any).adPhotoUrls.length > 0) || (item as any).adNotes);
            const hasQualityItems = !!(((item as any).qualityItems && Object.keys((item as any).qualityItems).length > 0) || ((item as any).qualityPhotoUrls && (item as any).qualityPhotoUrls.length > 0) || (item as any).qualityNotes);
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={item.id}
                id={`vm-card-${item.id}`}
                className={`bg-white rounded-3xl overflow-hidden shadow-lg shadow-black/5 transition-all ${hasNotok ? 'border-2 border-primary' : 'border border-border/50 hover:shadow-xl'}`}
                data-testid={`card-checklist-${item.id}`}
              >
                {(() => {
                  const photos: string[] = (item as any).photoUrls?.length ? (item as any).photoUrls : item.photoUrl ? [item.photoUrl] : [];
                  if (photos.length === 0) return (
                    <div className="w-full h-32 bg-muted/50 flex flex-col items-center justify-center text-muted-foreground border-b border-border/50">
                      <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-sm font-medium">사진 없음</span>
                    </div>
                  );
                  if (photos.length === 1) return (
                    <PhotoThumbnail src={photos[0]} className="w-full h-48 bg-muted relative block">
                      <img src={photos[0]} alt="Checklist" className="w-full h-full object-cover" />
                      {hasNotok && (
                        <div className="absolute top-3 left-3 bg-primary text-white px-3 py-1 rounded-full text-sm font-bold shadow-md flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> 불일치 항목 있음
                        </div>
                      )}
                    </PhotoThumbnail>
                  );
                  return (
                    <div className="relative border-b border-border/50">
                      <div className="flex gap-1 overflow-x-auto no-scrollbar p-1">
                        {photos.map((url, pi) => (
                          <PhotoThumbnail key={pi} src={url} className="shrink-0 w-36 h-36 rounded-2xl overflow-hidden block">
                            <img src={url} alt={`사진 ${pi + 1}`} className="w-full h-full object-cover" />
                          </PhotoThumbnail>
                        ))}
                      </div>
                      {hasNotok && (
                        <div className="absolute top-3 left-3 bg-primary text-white px-3 py-1 rounded-full text-sm font-bold shadow-md flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> 불일치 항목 있음
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full">{photos.length}장</div>
                    </div>
                  );
                })()}

                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{item.category}</span>
                        {(item as any).checklistType === 'ad' && (
                          <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">📢 광고점검</span>
                        )}
                        {(item as any).checklistType === 'quality' && (
                          <span className="text-xs font-bold text-purple-700 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-md">⭐ 품질점검</span>
                        )}
                      </div>
                      <h3 className="text-xl font-black text-secondary leading-tight">
                        {item.branch}점 <span className="font-medium text-muted-foreground text-lg ml-1">| {item.product}</span>
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {adminScore != null ? (
                        <div className={`px-3 py-1.5 rounded-xl border text-sm font-black flex items-center gap-1 ${
                          adminScore >= 80 ? 'bg-blue-50 border-blue-200 text-blue-700' :
                          adminScore >= 60 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                          'bg-red-50 border-red-200 text-primary'
                        }`} data-testid={`text-admin-score-${item.id}`}>
                          <Star className="w-3.5 h-3.5" />{adminScore}점
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 rounded-xl bg-muted border border-border text-xs text-muted-foreground font-medium">미평가</div>
                      )}
                      {hasAdItems && viewFilter !== 'vm' && viewFilter !== 'quality' && (
                        adAdminScore != null ? (
                          <div className={`px-2.5 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1 ${
                            adAdminScore >= 80 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            adAdminScore >= 60 ? 'bg-orange-50 border-orange-200 text-orange-700' :
                            'bg-red-50 border-red-200 text-primary'
                          }`} data-testid={`text-ad-score-${item.id}`}>
                            <span className="text-[11px]">📢</span>{adAdminScore}점
                          </div>
                        ) : (
                          <div className="px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium flex items-center gap-1">
                            <span className="text-[11px]">📢</span>광고미평가
                          </div>
                        )
                      )}
                      {hasQualityItems && viewFilter !== 'vm' && viewFilter !== 'ad' && (
                        qualityAdminScore != null ? (
                          <div className={`px-2.5 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1 ${
                            qualityAdminScore >= 80 ? 'bg-purple-50 border-purple-200 text-purple-700' :
                            qualityAdminScore >= 60 ? 'bg-purple-50 border-purple-200 text-purple-600' :
                            'bg-red-50 border-red-200 text-primary'
                          }`} data-testid={`text-quality-score-${item.id}`}>
                            <span className="text-[11px]">⭐</span>{qualityAdminScore}점
                          </div>
                        ) : (
                          <div className="px-2.5 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-700 font-medium flex items-center gap-1">
                            <span className="text-[11px]">⭐</span>품질미평가
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Year/Month display */}
                  {((item as any).year && (item as any).month) && (
                    <p className="text-xs font-bold text-primary/70 mb-2 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {(item as any).year}년 {(item as any).month}월 점검
                    </p>
                  )}

                  {viewFilter !== 'ad' && viewFilter !== 'quality' && item.items && Object.keys(item.items as object).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Object.entries(item.items as Record<string, string>).map(([name, status]) => {
                        const adminItems = (item as any).adminItems as Record<string, 'ok' | 'notok'> | null;
                        const adminVal = adminItems?.[name];
                        const staffIsOk = status === 'ok' || status === 'excellent';
                        const adminIsOk = adminVal === 'ok';
                        const wasChanged = adminVal != null && adminIsOk !== staffIsOk;
                        return (
                          <span key={name} className={`text-[10px] px-2 py-1 rounded-full font-bold border inline-flex items-center gap-1 ${
                            wasChanged
                              ? 'bg-amber-50 border-amber-300 text-amber-700'
                              : staffIsOk ? 'bg-blue-50 border-blue-200 text-blue-600'
                              : 'bg-red-50 border-red-200 text-red-600'
                          }`}>
                            {name}:&nbsp;
                            {wasChanged ? (
                              <>
                                <span className="line-through opacity-50">{staffIsOk ? '○' : '✗'}</span>
                                <span>→ {adminIsOk ? '○' : '✗'}</span>
                                <span className="text-[9px] bg-amber-200 text-amber-800 px-1 rounded-full ml-0.5">수정</span>
                              </>
                            ) : (
                              <span>{staffIsOk ? '○' : '✗'}</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground font-medium flex items-center gap-2 mt-4">
                    {format(new Date(item.createdAt), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                  </p>

                  {viewFilter !== 'ad' && viewFilter !== 'quality' && item.notes && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-2xl text-secondary text-sm border border-border">
                      <strong className="block mb-1 text-xs text-muted-foreground">요청/특이사항:</strong>
                      {item.notes}
                    </div>
                  )}

                  {viewFilter !== 'ad' && viewFilter !== 'quality' && (
                    <AdminScoreInput
                      id={item.id}
                      existingScore={(item as any).adminScore}
                      staffItems={(item.items as Record<string, string>) || {}}
                      existingAdminItems={(item as any).adminItems as Record<string, 'ok' | 'notok'> | null}
                    />
                  )}

                  {(() => {
                    const adItems = (item as any).adItems as Record<string, string> | null;
                    const adPhotoUrls = (item as any).adPhotoUrls as string[] | null;
                    const adNotes = (item as any).adNotes as string | null;
                    const hasAdItems = adItems && Object.keys(adItems).length > 0;
                    const hasAdPhotos = adPhotoUrls && adPhotoUrls.length > 0;
                    const hasAdData = hasAdItems || hasAdPhotos || adNotes;
                    if (!hasAdData || viewFilter === 'vm') return null;
                    const adAdminItems = (item as any).adAdminItems as Record<string, 'ok' | 'notok'> | null;
                    return (
                      <>
                        {hasAdItems && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <span className="text-[10px] px-2 py-1 rounded-full font-black border bg-amber-50 border-amber-300 text-amber-700 inline-flex items-center gap-1">📢 광고</span>
                            {Object.entries(adItems!).map(([name, status]) => {
                              const adminVal = adAdminItems?.[name];
                              const staffIsOk = status === 'ok';
                              const adminIsOk = adminVal === 'ok';
                              const wasChanged = adminVal != null && adminIsOk !== staffIsOk;
                              return (
                                <span key={name} className={`text-[10px] px-2 py-1 rounded-full font-bold border inline-flex items-center gap-1 ${
                                  wasChanged ? 'bg-amber-50 border-amber-300 text-amber-700'
                                  : staffIsOk ? 'bg-amber-50 border-amber-200 text-amber-600'
                                  : 'bg-red-50 border-red-200 text-red-600'
                                }`}>
                                  {name}:&nbsp;
                                  {wasChanged ? (
                                    <>
                                      <span className="line-through opacity-50">{staffIsOk ? '○' : '✗'}</span>
                                      <span>→ {adminIsOk ? '○' : '✗'}</span>
                                      <span className="text-[9px] bg-amber-200 text-amber-800 px-1 rounded-full ml-0.5">수정</span>
                                    </>
                                  ) : (
                                    <span>{staffIsOk ? '○' : '✗'}</span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {adNotes && (
                          <div className="mt-3 p-3 bg-amber-50/80 rounded-2xl border border-amber-200">
                            <strong className="block mb-1 text-[11px] text-amber-700 font-black">📢 광고 특이사항:</strong>
                            <p className="text-sm text-secondary">{adNotes}</p>
                          </div>
                        )}
                        <AdminAdScoreInput
                          id={item.id}
                          existingScore={(item as any).adAdminScore}
                          staffAdItems={adItems || {}}
                          existingAdminItems={adAdminItems}
                        />
                      </>
                    );
                  })()}

                  {(() => {
                    const qualityItems = (item as any).qualityItems as Record<string, string> | null;
                    const qualityPhotoUrls = (item as any).qualityPhotoUrls as string[] | null;
                    const qualityNotes = (item as any).qualityNotes as string | null;
                    const hasQualityItemsInner = qualityItems && Object.keys(qualityItems).length > 0;
                    const hasQualityPhotos = qualityPhotoUrls && qualityPhotoUrls.length > 0;
                    const hasQualityData = hasQualityItemsInner || hasQualityPhotos || qualityNotes;
                    if (!hasQualityData || viewFilter === 'vm' || viewFilter === 'ad') return null;
                    const qualityAdminItems = (item as any).qualityAdminItems as Record<string, 'ok' | 'notok'> | null;
                    return (
                      <>
                        {hasQualityItemsInner && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <span className="text-[10px] px-2 py-1 rounded-full font-black border bg-purple-50 border-purple-300 text-purple-700 inline-flex items-center gap-1">⭐ 품질</span>
                            {Object.entries(qualityItems!).map(([name, status]) => {
                              const adminVal = qualityAdminItems?.[name];
                              const staffIsOk = status === 'ok';
                              const adminIsOk = adminVal === 'ok';
                              const wasChanged = adminVal != null && adminIsOk !== staffIsOk;
                              return (
                                <span key={name} className={`text-[10px] px-2 py-1 rounded-full font-bold border inline-flex items-center gap-1 ${
                                  wasChanged ? 'bg-purple-50 border-purple-300 text-purple-700'
                                  : staffIsOk ? 'bg-purple-50 border-purple-200 text-purple-600'
                                  : 'bg-red-50 border-red-200 text-red-600'
                                }`}>
                                  {name}:&nbsp;
                                  {wasChanged ? (
                                    <>
                                      <span className="line-through opacity-50">{staffIsOk ? '○' : '✗'}</span>
                                      <span>→ {adminIsOk ? '○' : '✗'}</span>
                                      <span className="text-[9px] bg-purple-200 text-purple-800 px-1 rounded-full ml-0.5">수정</span>
                                    </>
                                  ) : (
                                    <span>{staffIsOk ? '○' : '✗'}</span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {qualityNotes && (
                          <div className="mt-3 p-3 bg-purple-50/80 rounded-2xl border border-purple-200">
                            <strong className="block mb-1 text-[11px] text-purple-700 font-black">⭐ 품질 특이사항:</strong>
                            <p className="text-sm text-secondary">{qualityNotes}</p>
                          </div>
                        )}
                        <AdminQualityScoreInput
                          id={item.id}
                          existingScore={(item as any).qualityAdminScore}
                          staffQualityItems={qualityItems || {}}
                          existingAdminItems={qualityAdminItems}
                        />
                      </>
                    );
                  })()}

                  <AdminCommentInput
                    id={item.id}
                    type="vm"
                    existingComment={(item as any).adminComment}
                    confirmed={(item as any).commentConfirmed}
                    staffReply={(item as any).staffReply}
                  />

                  {(item as any).adminComment && (
                    <div className="mt-2">
                      <VMCommentThread
                        checklistId={item.id}
                        adminComment={(item as any).adminComment}
                        confirmed={(item as any).commentConfirmed}
                        isAdmin={true}
                        hideComment={true}
                      />
                    </div>
                  )}

                  <div className="flex gap-3 mt-4">
                    <Link href={`/checklist/edit/${item.id}`} className="flex-1">
                      <button
                        className="w-full py-3 rounded-2xl border-2 border-border bg-muted text-secondary font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:border-primary/40 hover:text-primary"
                        data-testid={`button-edit-checklist-${item.id}`}
                      >
                        <Pencil className="w-5 h-5" /> 수정
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(item.id, `${item.branch} ${item.product}`)}
                      disabled={deleteMutation.isPending}
                      className="py-3 px-5 rounded-2xl border-2 border-red-200 bg-red-50 text-red-500 font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-red-100 hover:border-red-400 disabled:opacity-50"
                      data-testid={`button-delete-checklist-${item.id}`}
                    >
                      <Trash2 className="w-5 h-5" /> 삭제
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </>
  );
}

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function CleaningTab({ highlightId, highlightDate, highlightBranch }: { highlightId?: number; highlightDate?: string; highlightBranch?: string }) {
  const todayStr = toLocalDateStr(new Date());
  const [filterBranch, setFilterBranch] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [filterTime, setFilterTime] = useState<'전체' | '오픈' | '마감'>('전체');
  const { toast } = useToast();

  useEffect(() => {
    if (!highlightId) return;
    if (highlightBranch) setFilterBranch(highlightBranch);
    setFilterTime('전체');
    if (highlightDate) setSelectedDate(highlightDate);

    const scrollToCard = () => {
      const el = document.getElementById(`cleaning-card-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-emerald-500', 'ring-offset-2');
        setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-500', 'ring-offset-2'), 2500);
        return true;
      }
      return false;
    };

    // Try at 400ms, then retry at 800ms if data hasn't loaded yet
    const t1 = setTimeout(() => {
      if (!scrollToCard()) {
        const t2 = setTimeout(scrollToCard, 400);
        return () => clearTimeout(t2);
      }
    }, 400);
    return () => clearTimeout(t1);
  }, [highlightId, highlightDate, highlightBranch]);
  const deleteMutation = useDeleteCleaning();
  const itemStatusMutation = useUpdateCleaningItemStatus();

  const handleItemResolve = async (id: number, itemName: string) => {
    try {
      await itemStatusMutation.mutateAsync({ id, itemName, newStatus: 'ok' });
      toast({ title: "항목 완료 처리됨", description: `'${itemName}' 항목이 이상없음으로 변경됐습니다.` });
    } catch {
      toast({ title: "변경 실패", variant: "destructive" });
    }
  };
  const isToday = selectedDate === todayStr;

  const { data: allRecords = [], isLoading } = useCleaningInspections(
    filterBranch ? { branch: filterBranch } : {}
  );

  // Records for the selected date, filtered by inspection time
  const dayRecords = allRecords.filter(r => {
    if (toLocalDateStr(new Date(r.createdAt)) !== selectedDate) return false;
    if (filterTime !== '전체' && r.inspectionTime !== filterTime) return false;
    return true;
  });

  const goBack = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(toLocalDateStr(d));
  };
  const goForward = () => {
    if (isToday) return;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(toLocalDateStr(d));
  };

  const selectedDateObj = new Date(selectedDate + 'T00:00:00');

  // Zone status summary for selected date (latest record per zone, for grid display)
  const zoneStatus: Record<string, { status: string; time: string; id: number } | null> = {};
  ZONES.forEach(z => { zoneStatus[z] = null; });
  dayRecords.forEach(r => {
    if (!zoneStatus[r.zone] || new Date(r.createdAt) > new Date((zoneStatus[r.zone] as any).createdAt)) {
      zoneStatus[r.zone] = { status: r.overallStatus, time: r.inspectionTime, id: r.id };
    }
  });

  // Issue list for selected date
  const issues: { recordId: number; zone: string; item: string; memo?: string | null; photoUrl?: string | null; time: string }[] = [];
  dayRecords.forEach(r => {
    if (r.items) {
      Object.entries(r.items as Record<string, any>).forEach(([item, data]) => {
        if (data.status === 'issue') {
          issues.push({ recordId: r.id, zone: r.zone, item, memo: data.memo, photoUrl: data.photoUrl, time: r.inspectionTime });
        }
      });
    }
  });

  // Completion rate calculation:
  // - Denominator = ZONES × times (2 when '전체', 1 when specific time)
  // - Each slot earns (non-issue items / total items) points — issues reduce the rate
  const relevantTimes = filterTime === '전체' ? ['오픈', '마감'] : [filterTime];
  const totalSlots = ZONES.length * relevantTimes.length;

  // Build slot map: latest record per (zone × time) pair
  const slotMap: Record<string, typeof dayRecords[0] | null> = {};
  ZONES.forEach(z => relevantTimes.forEach(t => { slotMap[`${z}_${t}`] = null; }));
  // Use all day records for the selected date (ignoring filterTime so we can look at both)
  allRecords
    .filter(r => toLocalDateStr(new Date(r.createdAt)) === selectedDate)
    .forEach(r => {
      const key = `${r.zone}_${r.inspectionTime}`;
      if (key in slotMap) {
        if (!slotMap[key] || new Date(r.createdAt) > new Date(slotMap[key]!.createdAt)) {
          slotMap[key] = r;
        }
      }
    });

  let completionScore = 0;
  let completedSlotCount = 0;
  Object.values(slotMap).forEach(record => {
    if (record) {
      completedSlotCount++;
      const items = record.items as Record<string, { status: string }> || {};
      const total = Object.keys(items).length;
      const issueCount = Object.values(items).filter((v: any) => v.status === 'issue').length;
      const quality = total > 0 ? (total - issueCount) / total : 1;
      completionScore += quality;
    }
  });

  const completionRate = totalSlots > 0 ? Math.round((completionScore / totalSlots) * 100) : 0;
  const completedZones = ZONES.filter(z => zoneStatus[z] !== null).length;

  const handleDelete = async (id: number) => {
    if (!confirm("이 점검 기록을 삭제하시겠습니까?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "삭제 완료" });
    } catch {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  };

  return (
    <>
      {/* Branch filter + date navigator */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-border/50 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={filterBranch}
            onChange={e => setFilterBranch(e.target.value)}
            className={`flex-1 bg-muted border-none rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-emerald-400/50 outline-none text-sm ${filterBranch ? 'text-secondary' : 'text-muted-foreground'}`}
          >
            <option value="">지점 선택</option>
            {BRANCHES.filter(b => b !== '전체').map(b => (
              <option key={b} value={b}>{b}점</option>
            ))}
          </select>
        </div>

        {/* Date navigator + 오픈/마감 filter — only when a branch is selected */}
        {filterBranch && <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-muted rounded-2xl p-1 flex-1">
            <button
              onClick={goBack}
              className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-95 transition-all"
              data-testid="btn-date-prev"
            >
              <ChevronLeft className="w-5 h-5 text-secondary" />
            </button>
            <div className="flex-1 text-center">
              <p className="font-black text-secondary text-sm whitespace-nowrap">
                {isToday ? '오늘 · ' : ''}{format(selectedDateObj, 'M월 d일 (EEE)', { locale: ko })}
              </p>
            </div>
            <button
              onClick={goForward}
              disabled={isToday}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed bg-white shadow-sm"
              data-testid="btn-date-next"
            >
              <ChevronRight className="w-5 h-5 text-secondary" />
            </button>
          </div>

          {/* 오픈 / 마감 toggle */}
          <div className="flex bg-muted rounded-2xl p-1 gap-0.5 shrink-0">
            {(['전체', '오픈', '마감'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterTime(t)}
                className={`flex items-center gap-0.5 px-2 py-2 rounded-xl text-xs font-bold transition-all ${
                  filterTime === t
                    ? t === '오픈' ? 'bg-amber-400 text-white shadow-sm'
                      : t === '마감' ? 'bg-secondary text-white shadow-sm'
                      : 'bg-white text-secondary shadow-sm'
                    : 'text-muted-foreground hover:text-secondary'
                }`}
                data-testid={`btn-filter-time-${t}`}
              >
                {t === '오픈' && <Sun className="w-3 h-3" />}
                {t === '마감' && <Moon className="w-3 h-3" />}
                {t}
              </button>
            ))}
          </div>
        </div>}
      </div>

      <div className="p-4 space-y-5">
      {!filterBranch ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
          <Droplets className="w-12 h-12 text-emerald-300" />
          <p className="text-base font-semibold">지점을 선택해 주세요</p>
          <p className="text-sm text-center">위 드롭다운에서 지점을 선택하면<br />청소 점검 현황을 확인할 수 있습니다.</p>
        </div>
      ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
          </div>
      ) : (<>
            {/* Summary card for selected date */}
            <div className="bg-secondary text-white rounded-3xl p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Droplets className="w-6 h-6 text-emerald-400" />
                <h3 className="text-xl font-black">
                  {isToday ? '오늘의' : format(selectedDateObj, 'M월 d일', { locale: ko })} 청소 점검 현황
                </h3>
              </div>
              <div className="flex gap-4 mb-5">
                <div className="flex-1 bg-white/10 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-black text-emerald-400">{completedSlotCount}<span className="text-lg text-white/60">/{totalSlots}</span></p>
                  <p className="text-sm text-white/70 font-medium mt-1">점검 완료</p>
                </div>
                <div className="flex-1 bg-white/10 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-black text-primary">{issues.length}</p>
                  <p className="text-sm text-white/70 font-medium mt-1">문제 발생</p>
                </div>
                <div className="flex-1 bg-white/10 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-black text-white">{completionRate}<span className="text-lg text-white/60">%</span></p>
                  <p className="text-sm text-white/70 font-medium mt-1">완료율</p>
                </div>
              </div>

              {/* Zone status */}
              <div className="grid grid-cols-5 gap-2">
                {ZONES.map(zone => {
                  const s = zoneStatus[zone];
                  return (
                    <div
                      key={zone}
                      className={`rounded-2xl p-3 text-center border-2 ${
                        !s ? 'border-white/10 bg-white/5' :
                        s.status === 'ok' ? 'border-emerald-400 bg-emerald-500/20' :
                        'border-primary bg-red-500/20'
                      }`}
                    >
                      <div className="flex justify-center mb-1">
                        {!s ? (
                          <div className="w-6 h-6 rounded-full border-2 border-white/30" />
                        ) : s.status === 'ok' ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <XCircle className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-white">{zone}</p>
                      {s && (
                        <p className="text-[10px] text-white/60 mt-0.5 flex items-center justify-center gap-0.5">
                          {s.time === '오픈' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                          {s.time}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Issues for selected date */}
            {issues.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-black text-secondary flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-primary" />
                  {isToday ? '오늘' : format(selectedDateObj, 'M월 d일', { locale: ko })} 발생한 문제
                </h3>
                {issues.map((issue, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl border-2 border-red-200 overflow-hidden shadow-sm"
                  >
                    <div className="flex gap-3 p-4">
                      {issue.photoUrl && (
                        <PhotoThumbnail src={issue.photoUrl} className="w-20 h-20 shrink-0">
                          <img src={issue.photoUrl} className="w-20 h-20 rounded-xl object-cover border border-border" alt="Issue" />
                        </PhotoThumbnail>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-red-100 text-primary">{issue.zone}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            {issue.time === '오픈' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                            {issue.time}
                          </span>
                        </div>
                        <p className="font-bold text-secondary truncate">{issue.item}</p>
                        {issue.memo && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">{issue.memo}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleItemResolve(issue.recordId, issue.item)}
                        disabled={itemStatusMutation.isPending}
                        className="shrink-0 self-center flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-100 active:scale-[0.96] transition-all disabled:opacity-50"
                        data-testid={`btn-resolve-issue-${i}`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-[10px] font-black">완료처리</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Records for selected date */}
            {dayRecords.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-black text-secondary">
                  {isToday ? '오늘의' : format(selectedDateObj, 'M월 d일', { locale: ko })} 점검 기록
                </h3>
                {[...dayRecords].sort((a, b) => {
                  if (a.overallStatus === 'issue' && b.overallStatus !== 'issue') return -1;
                  if (a.overallStatus !== 'issue' && b.overallStatus === 'issue') return 1;
                  return 0;
                }).map((record, i) => {
                  const items = record.items as Record<string, { status: string; memo?: string | null }> || {};
                  const issueItems = Object.entries(items).filter(([, v]) => v.status === 'issue' || v.status === 'partial');
                  const cleanScore = calcCleaningScore(items);
                  return (
                    <motion.div
                      key={record.id}
                      id={`cleaning-card-${record.id}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm transition-all ${
                        record.overallStatus === 'issue' ? 'border-red-200' : 'border-emerald-200'
                      }`}
                      data-testid={`card-cleaning-${record.id}`}
                    >
                      <div className="p-4 flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${record.overallStatus === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-primary'}`}>
                              {record.overallStatus === 'ok' ? 'OK' : 'ISSUE'}
                            </span>
                            <span className="font-black text-secondary">{record.branch}점</span>
                            <span className="font-bold text-secondary">· {record.zone}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              {record.inspectionTime === '오픈' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                              {record.inspectionTime}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(record.createdAt), 'MM월 dd일 HH:mm', { locale: ko })}
                          </p>
                          {issueItems.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {issueItems.map(([name, v]) => (
                                <button
                                  key={name}
                                  onClick={() => handleItemResolve(record.id, name)}
                                  disabled={itemStatusMutation.isPending}
                                  className={`group flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border font-bold transition-all active:scale-95 disabled:opacity-50 ${v.status === 'partial' ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'}`}
                                  data-testid={`btn-badge-resolve-${record.id}-${name}`}
                                  title={`'${name}' 완료처리`}
                                >
                                  {name}
                                  <CheckCircle2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {Object.keys(items).length > 0 && (
                            <div className={`px-2.5 py-1.5 rounded-xl border text-sm font-black ${scoreColor(cleanScore)}`}
                              data-testid={`text-cleaning-score-${record.id}`}>
                              {cleanScore}점
                            </div>
                          )}
                          <button
                            onClick={() => handleDelete(record.id)}
                            disabled={deleteMutation.isPending}
                            className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                            data-testid={`button-delete-cleaning-${record.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="px-4 pb-4 space-y-2">
                        <AdminCommentInput
                          id={record.id}
                          type="cleaning"
                          existingComment={(record as any).adminComment}
                          confirmed={(record as any).commentConfirmed}
                          staffReply={(record as any).staffReply}
                        />
                        {(record as any).adminComment && (
                          <CleaningCommentThread
                            cleaningId={record.id}
                            adminComment={(record as any).adminComment}
                            confirmed={(record as any).commentConfirmed}
                            isAdmin={true}
                            hideComment={true}
                          />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {dayRecords.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Calendar className="w-8 h-8 opacity-40" />
                </div>
                <p className="font-medium text-lg">
                  {isToday ? '오늘은' : format(selectedDateObj, 'M월 d일은', { locale: ko })} 청소 점검 기록이 없습니다
                </p>
                {!isToday && (
                  <button onClick={() => setSelectedDate(todayStr)} className="text-sm font-bold text-emerald-600 underline underline-offset-2">
                    오늘로 돌아가기
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

type ActivityItem = {
  activityType: 'vm_submit' | 'cleaning_submit' | 'vm_reply' | 'cleaning_reply' | 'vm_edit';
  branch: string;
  description: string;
  category?: string;
  zone?: string;
  content?: string;
  relatedId: number;
  createdAt: string;
};

function RankingTab() {
  const now = new Date();
  const [rankYear, setRankYear] = useState(now.getFullYear());
  const [rankMonth, setRankMonth] = useState(now.getMonth() + 1);
  const [rankType, setRankType] = useState<'vm' | 'ad' | 'quality'>('vm');
  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const ALL_BRANCHES = BRANCHES.slice(1);
  const STORE_TYPE_ORDER: Record<string, number> = {};
  // 대형→중형→소형, 각 그룹 내 서울→수도권→지방 순
  const SORTED_BRANCHES = [
    '강남','강서','불광','송파','신구로', // 대형 서울
    '야탑','부천','평촌','분당',           // 대형 수도권
    '구의',                               // 중형 서울
    '일산','광명','쇼핑','산본','동수원',  // 중형 수도권
    '유성','수성','해운대','괴정',         // 중형 지방
    '중계','강북',                         // 소형 서울
    '인천','안양','고잔','김포',           // 소형 수도권
    '부산대','청주',                       // 소형 지방
  ];
  SORTED_BRANCHES.forEach((b, i) => { STORE_TYPE_ORDER[b] = i; });

  const { data: agriAll, isLoading } = useChecklists({ category: '농산' });

  const agriPeriod = (agriAll ?? []).filter(item => {
    const itemYear = (item as any).year;
    const itemMonth = (item as any).month;
    if (itemYear && itemMonth) return itemYear === rankYear && itemMonth === rankMonth;
    const d = new Date(item.createdAt);
    return d.getFullYear() === rankYear && d.getMonth() + 1 === rankMonth;
  });

  const ranking = useMemo(() => {
    const byBranch: Record<string, number[]> = {};
    const pendingSet = new Set<string>();
    agriPeriod.forEach(item => {
      const br = (item as any).branch as string;
      if (!br) return;
      let score: number | null = null;
      if (rankType === 'vm') {
        if ((item as any).checklistType === 'ad' || (item as any).checklistType === 'quality') return;
        score = (item as any).adminScore as number | null;
      } else if (rankType === 'ad') {
        score = (item as any).adAdminScore as number | null;
      } else {
        score = (item as any).qualityAdminScore as number | null;
      }
      if (score != null) {
        (byBranch[br] = byBranch[br] ?? []).push(score);
        pendingSet.delete(br);
      } else if (!byBranch[br]) {
        pendingSet.add(br);
      }
    });
    const scoredList = Object.entries(byBranch)
      .map(([branch, scores]) => ({ branch, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), count: scores.length, status: 'scored' as const }))
      .sort((a, b) => b.avg - a.avg || (STORE_TYPE_ORDER[a.branch] ?? 99) - (STORE_TYPE_ORDER[b.branch] ?? 99));
    const pendingList = ALL_BRANCHES.filter(br => pendingSet.has(br))
      .sort((a, b) => (STORE_TYPE_ORDER[a] ?? 99) - (STORE_TYPE_ORDER[b] ?? 99))
      .map(branch => ({ branch, avg: null as number | null, count: 0, status: 'pending' as const }));
    const scoredSet = new Set(Object.keys(byBranch));
    const noneList = ALL_BRANCHES.filter(br => !scoredSet.has(br) && !pendingSet.has(br))
      .sort((a, b) => (STORE_TYPE_ORDER[a] ?? 99) - (STORE_TYPE_ORDER[b] ?? 99))
      .map(branch => ({ branch, avg: null as number | null, count: 0, status: 'none' as const }));
    return [...scoredList, ...pendingList, ...noneList];
  }, [agriPeriod, rankType]);

  return (
    <div className="p-3 space-y-2">
      {/* Year/Month filter */}
      <div className="flex gap-1.5 items-center">
        <select value={rankYear} onChange={e => setRankYear(Number(e.target.value))}
          className="bg-muted border-none rounded-lg px-2 py-1.5 font-bold text-xs outline-none text-secondary shrink-0">
          {yearOptions.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <div className="flex gap-1 overflow-x-auto no-scrollbar flex-1 touch-pan-x">
          {monthOptions.map(m => (
            <button key={m} onClick={() => setRankMonth(m)}
              className={`shrink-0 px-2 py-1 rounded-lg font-bold text-xs transition-all active:scale-95 ${
                rankMonth === m ? 'bg-primary text-white shadow-sm' : 'bg-muted text-muted-foreground'
              }`}>
              {m}월
            </button>
          ))}
        </div>
      </div>

      {/* VM / Ad toggle + Grade legend in one row */}
      <div className="flex gap-1.5 items-center">
        {([['vm', '진열'], ['ad', '광고(+영상)'], ['quality', '품질']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setRankType(val)}
            className={`py-1.5 px-3 rounded-lg font-bold text-xs transition-all active:scale-95 border ${
              rankType === val
                ? val === 'ad' ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : val === 'quality' ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                : 'bg-primary text-white border-primary shadow-sm'
                : 'bg-muted text-muted-foreground border-transparent'
            }`}>
            {label}
          </button>
        ))}
        <div className="flex gap-1 ml-auto">
          {(['A', 'B', 'C'] as const).map(g => (
            <span key={g} className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${gradeColor(g)}`}>{g}</span>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">80/60/0 기준</span>
      </div>

      {/* Ranking list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-0.5">
          {(() => {
            let position = 0;
            let displayRank = 0;
            let prevAvg: number | null = null;
            return ranking.map(({ branch, avg, count, status }) => {
              const isScored = status === 'scored';
              const isPending = status === 'pending';
              if (isScored) {
                position++;
                if (avg !== prevAvg) {
                  displayRank = position;
                  prevAvg = avg;
                }
              }
              const medal = displayRank === 1 && isScored ? '🥇' : displayRank === 2 && isScored ? '🥈' : displayRank === 3 && isScored ? '🥉' : null;
              const grade = getGrade(avg);
              const gColor = gradeColor(grade);
              const avgColor = avg != null ? (avg >= 80 ? 'text-blue-600' : avg >= 60 ? 'text-amber-600' : 'text-red-500') : '';
              const rowBg = isScored
                ? (displayRank <= 3 ? 'bg-gradient-to-r from-primary/5 to-transparent border-primary/15' : 'bg-white border-border/40')
                : isPending ? 'bg-muted/30 border-border/20'
                : 'bg-muted/10 border-transparent';
              return (
                <div key={branch}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border ${rowBg}`}
                  data-testid={`row-ranking-${branch}`}>
                  {/* Rank */}
                  <div className="w-6 text-center shrink-0">
                    {medal
                      ? <span className="text-base leading-none">{medal}</span>
                      : isScored
                        ? <span className="text-xs font-black text-muted-foreground">{displayRank}</span>
                        : <span className="text-xs font-black text-muted-foreground/20">-</span>
                    }
                  </div>
                  {/* Branch */}
                  <div className="flex-1 min-w-0">
                    <span className={`font-bold text-sm ${isScored ? 'text-secondary' : 'text-muted-foreground/50'}`}>{branch}점</span>
                  </div>
                  {/* Score */}
                  <div className="w-12 text-right shrink-0">
                    {isScored ? (
                      <span className={`text-sm font-black ${avgColor}`}>{avg}<span className="text-[10px] font-medium text-muted-foreground ml-0.5">점</span></span>
                    ) : isPending ? (
                      <span className="text-[10px] font-bold text-muted-foreground">미평가</span>
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground/30">미점검</span>
                    )}
                  </div>
                  {/* Grade */}
                  <div className="w-8 text-center shrink-0">
                    {grade ? (
                      <span className={`text-xs font-black px-1.5 py-0.5 rounded border ${gColor}`}>{grade}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground/20">-</span>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
      <p className="text-center text-[10px] text-muted-foreground">농산 카테고리 기준 · 관리자 입력 점수</p>
    </div>
  );
}

function ActivityTab() {
  const [selectedBranch, setSelectedBranch] = useState('전체');

  const { data: activities = [], isLoading } = useQuery<ActivityItem[]>({
    queryKey: ['/api/admin/activity-log', selectedBranch],
    queryFn: () =>
      fetch(`/api/admin/activity-log?branch=${encodeURIComponent(selectedBranch)}`, { credentials: 'include' })
        .then(r => r.json()),
    refetchInterval: 30_000,
  });

  const typeConfig: Record<ActivityItem['activityType'], { label: string; icon: React.ReactNode; color: string }> = {
    vm_submit: { label: 'VM 점검 제출', icon: <UploadCloud className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
    cleaning_submit: { label: '청소 점검 제출', icon: <UploadCloud className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700' },
    vm_reply: { label: 'VM 댓글', icon: <Reply className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700' },
    cleaning_reply: { label: '청소 댓글', icon: <Reply className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700' },
    vm_edit: { label: 'VM 점검 수정', icon: <Pencil className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-700' },
  };

  return (
    <div className="p-4 space-y-4">
      {/* Branch filter */}
      <select
        value={selectedBranch}
        onChange={e => setSelectedBranch(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border-2 border-border text-base focus:outline-none focus:border-primary bg-white"
        data-testid="select-activity-branch"
      >
        {BRANCHES.map(b => <option key={b} value={b}>{b === '전체' ? '전체 지점' : `${b}점`}</option>)}
      </select>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>활동 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((item, idx) => {
            const cfg = typeConfig[item.activityType];
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-border p-4 flex items-start gap-3 shadow-sm"
                data-testid={`activity-item-${idx}`}
              >
                <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cfg.color}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-sm font-bold text-secondary">{item.branch}점</span>
                    {item.category && (
                      <span className="text-xs text-muted-foreground font-medium">{item.category}</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-secondary truncate">{item.description}</p>
                  {item.content && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">"{item.content}"</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(item.createdAt), 'M월 d일 HH:mm', { locale: ko })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: adminStatus, isLoading: authLoading } = useAdminStatus();
  const [activeTab, setActiveTab] = useState<'ranking' | 'vm' | 'cleaning' | 'activity'>('ranking');
  const [notifOpen, setNotifOpen] = useState(false);
  const [highlightTarget, setHighlightTarget] = useState<{ type: 'vm' | 'cleaning'; id: number; date?: string; branch?: string } | null>(null);
  const { notifications, unreadCount, dismiss, dismissAll } = useAdminNotifications();

  useEffect(() => {
    if (!authLoading && !adminStatus?.isAdmin) {
      setLocation("/admin/login");
    }
  }, [adminStatus, authLoading, setLocation]);

  const handleBellClick = () => {
    if (unreadCount === 0) return;
    setNotifOpen(true);
  };

  if (authLoading) {
    return (
      <Layout title="관리자 대시보드" showBack={true}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!adminStatus?.isAdmin) return null;

  return (
    <Layout title="관리자 대시보드" showBack={true}>
      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        onDismiss={dismiss}
        onDismissAll={dismissAll}
        onNavigate={(target, key) => {
          dismiss(key);
          setActiveTab(target.type as 'vm' | 'cleaning');
          const id = target.type === 'vm' ? target.checklistId : target.cleaningId;
          if (id != null) setHighlightTarget({ type: target.type, id, date: target.date, branch: target.branch });
          setNotifOpen(false);
        }}
      />
      <div className="flex flex-col h-full bg-background">
        {/* Tab switcher + bell */}
        <div className="flex gap-1 p-3 bg-muted/50 border-b border-border items-center">
          <button
            onClick={() => setActiveTab('ranking')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'ranking' ? 'bg-white text-violet-600 shadow-sm' : 'text-muted-foreground'
            }`}
            data-testid="tab-ranking"
          >
            <Trophy className="w-4 h-4" /> 점별 순위
          </button>
          <button
            onClick={() => setActiveTab('vm')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'vm' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'
            }`}
            data-testid="tab-vm"
          >
            <BarChart3 className="w-4 h-4" /> 점검
          </button>
          <button
            onClick={() => setActiveTab('cleaning')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'cleaning' ? 'bg-white text-emerald-600 shadow-sm' : 'text-muted-foreground'
            }`}
            data-testid="tab-cleaning"
          >
            <Droplets className="w-4 h-4" /> 청소
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'activity' ? 'bg-white text-amber-600 shadow-sm' : 'text-muted-foreground'
            }`}
            data-testid="tab-activity"
          >
            <ClipboardList className="w-4 h-4" /> 활동
          </button>
          {/* Notification bell — only clickable when unread exist */}
          <button
            onClick={handleBellClick}
            className={`relative w-10 h-10 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
              unreadCount > 0
                ? 'bg-white border-border shadow-sm active:scale-95'
                : 'bg-muted border-transparent cursor-default'
            }`}
            data-testid="btn-notification-bell"
          >
            <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-primary' : 'text-muted-foreground/40'}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center leading-none" data-testid="badge-unread-count">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'ranking' ? (
            <RankingTab />
          ) : activeTab === 'vm' ? (
            <VMTab highlightId={highlightTarget?.type === 'vm' ? highlightTarget.id : undefined} highlightBranch={highlightTarget?.type === 'vm' ? highlightTarget.branch : undefined} />
          ) : activeTab === 'cleaning' ? (
            <CleaningTab highlightId={highlightTarget?.type === 'cleaning' ? highlightTarget.id : undefined} highlightDate={highlightTarget?.type === 'cleaning' ? highlightTarget.date : undefined} highlightBranch={highlightTarget?.type === 'cleaning' ? highlightTarget.branch : undefined} />
          ) : (
            <ActivityTab />
          )}
        </div>
      </div>
    </Layout>
  );
}
