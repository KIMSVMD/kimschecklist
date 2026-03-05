import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useChecklists, useDeleteChecklist, useUpdateChecklistItemStatus } from "@/hooks/use-checklists";
import { useAdminStatus } from "@/hooks/use-guides";
import { useCleaningInspections, useDeleteCleaning, useUpdateCleaningItemStatus } from "@/hooks/use-cleaning";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { calcVMScore, calcCleaningScore, scoreColor } from "@/lib/scoring";
import {
  Filter, Image as ImageIcon, AlertCircle, Pencil, Trash2, Loader2,
  CheckCircle2, XCircle, BarChart3, Droplets, Sun, Moon,
  MessageSquare, Send, CheckCheck, CornerDownRight,
  ChevronLeft, ChevronRight, Calendar,
} from "lucide-react";
import { PhotoThumbnail } from "@/components/PhotoLightbox";
import { VMCommentThread } from "@/components/VMCommentThread";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useSaveChecklistComment } from "@/hooks/use-checklists";
import { useSaveCleaningComment } from "@/hooks/use-cleaning";
import { CleaningCommentThread } from "@/components/CleaningCommentThread";

const CATEGORIES = ['전체', '농산', '수산', '축산', '공산'];
const BRANCHES = ['전체', '강서', '강남', '송파', '야탑', '분당', '신구로', '구의', '불광', '평촌', '부천', '일산', '광명', '동수원', '산본', '중계', '고잔', '김포', '인천', '대전', '해운대', '괴정', '쇼핑', '수성'];
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

  const handleSave = async () => {
    try {
      await (saveMutation as any).mutateAsync({ id, adminComment: text });
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
              onClick={handleSave}
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

function VMTab() {
  const [filterBranch, setFilterBranch] = useState('전체');
  const [filterCategory, setFilterCategory] = useState('전체');
  const { toast } = useToast();
  const deleteMutation = useDeleteChecklist();
  const itemStatusMutation = useUpdateChecklistItemStatus();

  const handleItemResolve = async (id: number, itemName: string) => {
    try {
      await itemStatusMutation.mutateAsync({ id, itemName, newStatus: 'excellent' });
      toast({ title: "수정 완료 처리됨", description: `'${itemName}' 항목이 우수로 변경됐습니다.` });
    } catch {
      toast({ title: "변경 실패", variant: "destructive" });
    }
  };

  const { data: checklists, isLoading } = useChecklists({
    branch: filterBranch !== '전체' ? filterBranch : undefined,
    category: filterCategory !== '전체' ? filterCategory : undefined,
  });

  const handleDelete = async (id: number, label: string) => {
    if (!confirm(`"${label}" 점검 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "삭제 완료", description: "점검 기록이 삭제되었습니다." });
    } catch {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  };

  const statusColors = {
    excellent: 'bg-blue-100 text-blue-700',
    average: 'bg-amber-100 text-amber-700',
    poor: 'bg-red-100 text-primary border-primary font-bold'
  };
  const statusLabels = { excellent: '우수', average: '보통', poor: '미흡' };

  return (
    <>
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-border/50 p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-secondary font-bold">
          <Filter className="w-5 h-5" />
          <span>필터링</span>
        </div>
        <div className="flex gap-2">
          <select
            value={filterBranch}
            onChange={e => setFilterBranch(e.target.value)}
            className="flex-1 bg-muted border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary/50 outline-none text-secondary"
          >
            {BRANCHES.map(b => <option key={b} value={b}>{b === '전체' ? '전체 지점' : `${b}점`}</option>)}
          </select>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="flex-1 bg-muted border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary/50 outline-none text-secondary"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            데이터를 불러오는 중...
          </div>
        ) : !checklists?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 opacity-50" />
            </div>
            <p className="font-medium text-lg">조건에 맞는 점검 기록이 없습니다.</p>
          </div>
        ) : (
          checklists.map((item, index) => {
            const isPoor = item.status === 'poor';
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={item.id}
                className={`bg-white rounded-3xl overflow-hidden shadow-lg shadow-black/5 transition-all ${isPoor ? 'border-2 border-primary' : 'border border-border/50 hover:shadow-xl'}`}
                data-testid={`card-checklist-${item.id}`}
              >
                {item.photoUrl ? (
                  <PhotoThumbnail src={item.photoUrl} className="w-full h-48 bg-muted relative block">
                    <img src={item.photoUrl} alt="Checklist" className="w-full h-full object-cover" />
                    {isPoor && (
                      <div className="absolute top-3 left-3 bg-primary text-white px-3 py-1 rounded-full text-sm font-bold shadow-md flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> 긴급 조치 요망
                      </div>
                    )}
                  </PhotoThumbnail>
                ) : (
                  <div className="w-full h-32 bg-muted/50 flex flex-col items-center justify-center text-muted-foreground border-b border-border/50">
                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm font-medium">사진 없음</span>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-primary mb-1 bg-primary/10 w-max px-2 py-0.5 rounded-md">{item.category}</span>
                      <h3 className="text-xl font-black text-secondary leading-tight">
                        {item.branch}점 <span className="font-medium text-muted-foreground text-lg ml-1">| {item.product}</span>
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.items && Object.keys(item.items as object).length > 0 && (() => {
                        const score = calcVMScore(item.items as Record<string, string>, item.photoUrl);
                        return (
                          <div className={`px-2.5 py-1.5 rounded-xl border text-sm font-black ${scoreColor(score)}`}
                            data-testid={`text-score-${item.id}`}>
                            {score}점
                          </div>
                        );
                      })()}
                      <div className={`px-3 py-1.5 rounded-xl text-sm ${statusColors[item.status as keyof typeof statusColors]}`}>
                        {statusLabels[item.status as keyof typeof statusLabels]}
                      </div>
                    </div>
                  </div>

                  {item.items && Object.keys(item.items as object).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Object.entries(item.items as Record<string, string>).map(([name, status]) => (
                        <div key={name} className="flex items-center gap-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            status === 'excellent' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                            status === 'average' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                            'bg-red-50 border-red-200 text-red-600'
                          }`}>
                            {name}: {status === 'excellent' ? '우수' : status === 'average' ? '보통' : '미흡'}
                          </span>
                          {(status === 'poor' || status === 'average') && (
                            <button
                              onClick={() => handleItemResolve(item.id, name)}
                              disabled={itemStatusMutation.isPending}
                              className="flex items-center gap-0.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full disabled:opacity-50 transition-all active:scale-95"
                              title={`'${name}' 수정 완료 처리`}
                              data-testid={`btn-vm-item-resolve-${item.id}-${name}`}
                            >
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>완료</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground font-medium flex items-center gap-2 mt-4">
                    {format(new Date(item.createdAt), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                  </p>

                  {item.notes && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-2xl text-secondary text-sm border border-border">
                      <strong className="block mb-1 text-xs text-muted-foreground">요청/특이사항:</strong>
                      {item.notes}
                    </div>
                  )}

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

function CleaningTab() {
  const [filterBranch, setFilterBranch] = useState('');
  const { toast } = useToast();
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

  const todayStr = toLocalDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [filterTime, setFilterTime] = useState<'전체' | '오픈' | '마감'>('전체');
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
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm ${
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

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: adminStatus, isLoading: authLoading } = useAdminStatus();
  const [activeTab, setActiveTab] = useState<'vm' | 'cleaning'>('vm');

  useEffect(() => {
    if (!authLoading && !adminStatus?.isAdmin) {
      setLocation("/admin/login");
    }
  }, [adminStatus, authLoading, setLocation]);

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
      <div className="flex flex-col h-full bg-background">
        {/* Tab switcher */}
        <div className="flex gap-1 p-3 bg-muted/50 border-b border-border">
          <button
            onClick={() => setActiveTab('vm')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-base transition-all ${
              activeTab === 'vm' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'
            }`}
            data-testid="tab-vm"
          >
            <BarChart3 className="w-5 h-5" /> VM 점검
          </button>
          <button
            onClick={() => setActiveTab('cleaning')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-base transition-all ${
              activeTab === 'cleaning' ? 'bg-white text-emerald-600 shadow-sm' : 'text-muted-foreground'
            }`}
            data-testid="tab-cleaning"
          >
            <Droplets className="w-5 h-5" /> 청소 점검
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'vm' ? <VMTab /> : <CleaningTab />}
        </div>
      </div>
    </Layout>
  );
}
