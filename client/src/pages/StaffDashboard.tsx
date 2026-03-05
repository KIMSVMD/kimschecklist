import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { useChecklists, useDeleteChecklist, useConfirmChecklistComment, useSaveChecklistReply } from "@/hooks/use-checklists";
import { useCleaningInspections, useDeleteCleaning } from "@/hooks/use-cleaning";
import { CleaningCommentThread } from "@/components/CleaningCommentThread";
import { PhotoThumbnail } from "@/components/PhotoLightbox";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  ClipboardList, Image as ImageIcon, AlertCircle, Pencil, Trash2, MapPin,
  MessageSquare, CheckCheck, Loader2, Droplets, Sun, Moon, XCircle, BarChart3,
  CornerDownRight, Send, ChevronLeft, ChevronRight, Calendar,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { calcVMScore, calcCleaningScore, scoreColor } from "@/lib/scoring";

const REGIONS: Record<string, string[]> = {
  '수도권': ['강서', '강남', '송파', '야탑', '분당', '신구로', '구의', '불광', '평촌', '부천', '일산', '광명', '동수원', '산본', '중계', '고잔', '김포', '인천'],
  '지방': ['대전', '해운대', '괴정', '쇼핑', '수성'],
};
const CATEGORIES = ['전체', '농산', '수산', '축산', '공산'];

export default function StaffDashboard() {
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = toLocalDateStr(new Date());

  const [filterBranch, setFilterBranch] = useState('');
  const [filterCategory, setFilterCategory] = useState('전체');
  const [activeTab, setActiveTab] = useState<'vm' | 'cleaning'>('vm');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const { toast } = useToast();

  const isToday = selectedDate === todayStr;
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');

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

  const deleteMutation = useDeleteChecklist();
  const confirmVMMutation = useConfirmChecklistComment();
  const replyVMMutation = useSaveChecklistReply();
  const deleteCleaningMutation = useDeleteCleaning();

  const { data: checklists, isLoading: vmLoading } = useChecklists({
    branch: filterBranch || undefined,
    category: filterCategory !== '전체' ? filterCategory : undefined,
  });

  const { data: cleaningRecords = [], isLoading: cleaningLoading } = useCleaningInspections(
    filterBranch ? { branch: filterBranch } : {}
  );

  const handleDeleteVM = async (id: number, label: string) => {
    if (!confirm(`"${label}" 점검 기록을 삭제하시겠습니까?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "삭제 완료" });
    } catch {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  };

  const handleConfirmVM = async (id: number) => {
    try {
      await confirmVMMutation.mutateAsync(id);
      toast({ title: "확인 완료!", description: "관리자 코멘트를 확인했습니다." });
    } catch {
      toast({ title: "처리 실패", variant: "destructive" });
    }
  };

  const handleDeleteCleaning = async (id: number) => {
    if (!confirm("이 청소 점검 기록을 삭제하시겠습니까?")) return;
    try {
      await deleteCleaningMutation.mutateAsync(id);
      toast({ title: "삭제 완료" });
    } catch {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  };

  const statusColors = {
    excellent: 'bg-blue-100 text-blue-700',
    average: 'bg-amber-100 text-amber-700',
    poor: 'bg-red-100 text-primary font-bold',
  };
  const statusLabels = { excellent: '우수', average: '보통', poor: '미흡' };

  return (
    <Layout title="내 점검 목록" showBack={true}>
      <div className="flex flex-col h-full bg-background">

        {/* Filter header */}
        <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-border/50 p-4 space-y-3 shadow-sm">
          {/* Branch selector */}
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <select
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
              className="flex-1 bg-muted border-none rounded-xl px-4 py-3 font-bold text-lg focus:ring-2 focus:ring-primary/50 outline-none text-secondary"
              data-testid="select-staff-branch"
            >
              <option value="">지점 선택</option>
              <optgroup label="수도권">
                {REGIONS['수도권'].map(b => <option key={b} value={b}>{b}점</option>)}
              </optgroup>
              <optgroup label="지방">
                {REGIONS['지방'].map(b => <option key={b} value={b}>{b}점</option>)}
              </optgroup>
            </select>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-muted p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('vm')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'vm' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'
              }`}
              data-testid="tab-staff-vm"
            >
              <BarChart3 className="w-4 h-4" /> VM 점검
            </button>
            <button
              onClick={() => setActiveTab('cleaning')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'cleaning' ? 'bg-white text-emerald-600 shadow-sm' : 'text-muted-foreground'
              }`}
              data-testid="tab-staff-cleaning"
            >
              <Droplets className="w-4 h-4" /> 청소 점검
            </button>
          </div>

          {/* Category filter — only on VM tab */}
          {activeTab === 'vm' && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                    filterCategory === cat
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-muted text-muted-foreground hover:text-secondary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Date navigator — only on cleaning tab */}
          {activeTab === 'cleaning' && (
            <div className="flex items-center gap-2 bg-muted rounded-2xl p-1">
              <button
                onClick={goBack}
                className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-95 transition-all"
                data-testid="btn-staff-date-prev"
              >
                <ChevronLeft className="w-5 h-5 text-secondary" />
              </button>
              <div className="flex-1 text-center">
                <p className="font-black text-secondary text-sm">
                  {isToday ? '오늘 · ' : ''}{format(selectedDateObj, 'M월 d일 (EEE)', { locale: ko })}
                </p>
              </div>
              <button
                onClick={goForward}
                disabled={isToday}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed bg-white shadow-sm"
                data-testid="btn-staff-date-next"
              >
                <ChevronRight className="w-5 h-5 text-secondary" />
              </button>
            </div>
          )}
        </div>

        {/* No branch selected */}
        {!filterBranch ? (
          <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground text-center space-y-3 p-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <MapPin className="w-10 h-10 text-primary/60" />
            </div>
            <p className="font-bold text-xl text-secondary">지점을 선택해주세요</p>
            <p className="text-base">내 점검 목록을 확인할 지점을 먼저 선택하세요</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* ── VM TAB ── */}
            {activeTab === 'vm' && (
              vmLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                  불러오는 중...
                </div>
              ) : !checklists?.length ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <ClipboardList className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="font-medium text-lg">등록된 VM 점검 기록이 없습니다</p>
                  <Link href="/checklist/new">
                    <button className="px-6 py-3 rounded-2xl bg-primary text-white font-bold text-base">
                      새 점검 등록하기
                    </button>
                  </Link>
                </div>
              ) : (
                checklists.map((item, index) => {
                  const isPoor = item.status === 'poor';
                  const score = item.items && Object.keys(item.items as object).length > 0
                    ? calcVMScore(item.items as Record<string, string>, item.photoUrl)
                    : null;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      key={item.id}
                      className={`bg-white rounded-3xl overflow-hidden shadow-lg shadow-black/5
                        ${isPoor ? 'border-2 border-primary' : 'border border-border/50'}`}
                      data-testid={`card-checklist-${item.id}`}
                    >
                      {item.photoUrl ? (
                        <PhotoThumbnail src={item.photoUrl} className="w-full h-44 bg-muted relative block">
                          <img src={item.photoUrl} alt="현장사진" className="w-full h-full object-cover" />
                          {isPoor && (
                            <div className="absolute top-3 left-3 bg-primary text-white px-3 py-1 rounded-full text-sm font-bold shadow-md flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" /> 미흡 — 조치 필요
                            </div>
                          )}
                        </PhotoThumbnail>
                      ) : (
                        <div className="w-full h-28 bg-muted/50 flex flex-col items-center justify-center text-muted-foreground border-b border-border/50">
                          <ImageIcon className="w-7 h-7 mb-1 opacity-40" />
                          <span className="text-xs font-medium">사진 없음</span>
                        </div>
                      )}

                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{item.category}</span>
                            <h3 className="text-xl font-black text-secondary mt-1">{item.product}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            {score !== null && (
                              <div className={`px-2.5 py-1.5 rounded-xl border text-sm font-black ${scoreColor(score)}`}>
                                {score}점
                              </div>
                            )}
                            <span className={`px-3 py-1.5 rounded-xl text-sm border ${statusColors[item.status as keyof typeof statusColors]}`}>
                              {statusLabels[item.status as keyof typeof statusLabels]}
                            </span>
                          </div>
                        </div>

                        {item.items && Object.keys(item.items as object).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {Object.entries(item.items as Record<string, string>).map(([name, st]) => (
                              <span key={name} className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                st === 'excellent' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                                st === 'average' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                                'bg-red-50 border-red-200 text-red-600'
                              }`}>
                                {name.split(':')[0]}: {st === 'excellent' ? '우수' : st === 'average' ? '보통' : '미흡'}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="text-sm text-muted-foreground mb-3">
                          {format(new Date(item.createdAt), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                        </p>

                        {item.notes && (
                          <div className="mb-4 p-4 bg-muted/50 rounded-2xl text-secondary text-sm border border-border">
                            <strong className="block mb-1 text-xs text-muted-foreground">특이사항:</strong>
                            {item.notes}
                          </div>
                        )}

                        {(item as any).adminComment && (
                          <AdminCommentBox
                            comment={(item as any).adminComment}
                            confirmed={(item as any).commentConfirmed}
                            staffReply={(item as any).staffReply}
                            isPending={confirmVMMutation.isPending}
                            isReplying={replyVMMutation.isPending}
                            onConfirm={() => handleConfirmVM(item.id)}
                            onReply={reply => replyVMMutation.mutateAsync({ id: item.id, staffReply: reply }).then(() => toast({ title: "답글이 전송됐습니다" })).catch(() => toast({ title: "전송 실패", variant: "destructive" }))}
                            testId={`btn-confirm-comment-${item.id}`}
                          />
                        )}

                        <div className="flex gap-3 mt-4">
                          <Link href={`/checklist/edit/${item.id}`} className="flex-1">
                            <button
                              className="w-full py-4 rounded-2xl border-2 border-border bg-muted text-secondary font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:border-primary/40 hover:text-primary"
                              data-testid={`button-edit-staff-${item.id}`}
                            >
                              <Pencil className="w-5 h-5" /> 수정
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDeleteVM(item.id, item.product)}
                            disabled={deleteMutation.isPending}
                            className="py-4 px-5 rounded-2xl border-2 border-red-200 bg-red-50 text-red-500 font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-red-100 hover:border-red-300 disabled:opacity-50"
                            data-testid={`button-delete-staff-${item.id}`}
                          >
                            <Trash2 className="w-5 h-5" /> 삭제
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )
            )}

            {/* ── CLEANING TAB ── */}
            {activeTab === 'cleaning' && (
              cleaningLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mb-4" />
                  불러오는 중...
                </div>
              ) : cleaningRecords.filter(r => toLocalDateStr(new Date(r.createdAt)) === selectedDate).length === 0 ? (
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
                  {isToday && (
                    <Link href="/checklist/new">
                      <button className="px-6 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-base">
                        청소 점검 시작하기
                      </button>
                    </Link>
                  )}
                </div>
              ) : (
                cleaningRecords.filter(r => toLocalDateStr(new Date(r.createdAt)) === selectedDate).map((record, i) => {
                  const items = (record.items as Record<string, { status: string; memo?: string | null; photoUrl?: string | null }>) || {};
                  const issueItems = Object.entries(items).filter(([, v]) => v.status === 'issue');
                  const cleanScore = Object.keys(items).length > 0 ? calcCleaningScore(items) : null;
                  const isOk = record.overallStatus === 'ok';
                  return (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`bg-white rounded-3xl border-2 overflow-hidden shadow-lg shadow-black/5 ${
                        isOk ? 'border-emerald-200' : 'border-red-200'
                      }`}
                      data-testid={`card-cleaning-staff-${record.id}`}
                    >
                      {/* Header stripe */}
                      <div className={`px-5 py-3 flex items-center justify-between ${isOk ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isOk ? 'bg-emerald-500' : 'bg-primary'}`}>
                            {isOk
                              ? <CheckCheck className="w-4 h-4 text-white" />
                              : <XCircle className="w-4 h-4 text-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-secondary text-lg">{record.zone}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOk ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-primary'}`}>
                                {isOk ? '정상' : '문제'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {record.inspectionTime === '오픈' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                              <span>{record.inspectionTime}</span>
                              <span>·</span>
                              <span>{format(new Date(record.createdAt), 'MM월 dd일 HH:mm', { locale: ko })}</span>
                            </div>
                          </div>
                        </div>
                        {cleanScore !== null && (
                          <div className={`px-2.5 py-1.5 rounded-xl border text-sm font-black ${scoreColor(cleanScore)}`}>
                            {cleanScore}점
                          </div>
                        )}
                      </div>

                      <div className="p-5 space-y-3">
                        {issueItems.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-muted-foreground mb-2">문제 항목</p>
                            <div className="flex flex-wrap gap-1.5">
                              {issueItems.map(([name, v]) => (
                                <div key={name} className="bg-red-50 border border-red-200 rounded-xl px-3 py-1.5 w-full">
                                  {v.photoUrl && (
                                    <PhotoThumbnail src={v.photoUrl} className="block mb-1.5">
                                      <img src={v.photoUrl} alt={name} className="w-full h-24 object-cover rounded-lg" />
                                    </PhotoThumbnail>
                                  )}
                                  <span className="text-xs font-bold text-red-600">{name}</span>
                                  {v.memo && <p className="text-[10px] text-red-400 mt-0.5">{v.memo}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <CleaningCommentThread
                          cleaningId={record.id}
                          adminComment={(record as any).adminComment}
                          confirmed={(record as any).commentConfirmed}
                          isAdmin={false}
                        />

                        <button
                          onClick={() => handleDeleteCleaning(record.id)}
                          disabled={deleteCleaningMutation.isPending}
                          className="w-full py-3 rounded-2xl border-2 border-red-200 bg-red-50 text-red-500 font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-red-100 disabled:opacity-50"
                          data-testid={`button-delete-cleaning-staff-${record.id}`}
                        >
                          <Trash2 className="w-4 h-4" /> 삭제
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function AdminCommentBox({
  comment, confirmed, staffReply, isPending, isReplying, onConfirm, onReply, testId,
}: {
  comment: string;
  confirmed: boolean | null;
  staffReply?: string | null;
  isPending: boolean;
  isReplying: boolean;
  onConfirm: () => void;
  onReply: (reply: string) => void;
  testId: string;
}) {
  const [replyText, setReplyText] = useState(staffReply || "");
  const [replyOpen, setReplyOpen] = useState(false);

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${confirmed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      {/* Admin comment header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <MessageSquare className={`w-4 h-4 ${confirmed ? 'text-emerald-600' : 'text-amber-600'}`} />
        <span className={`text-xs font-black uppercase tracking-wide ${confirmed ? 'text-emerald-600' : 'text-amber-600'}`}>
          관리자 코멘트
        </span>
        {confirmed && (
          <span className="ml-auto text-xs font-bold text-emerald-600 flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5" /> 확인완료
          </span>
        )}
      </div>
      <p className="px-4 pb-3 text-secondary text-sm font-medium leading-relaxed">{comment}</p>

      {/* Confirm button (show until confirmed) */}
      {!confirmed && (
        <div className="px-4 pb-3">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-amber-500 text-white font-black text-base flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            data-testid={testId}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-5 h-5" />}
            확인했습니다
          </button>
        </div>
      )}

      {/* Staff reply section — show after confirming */}
      {confirmed && (
        <div className="px-4 pb-4 border-t border-emerald-200 pt-3">
          {staffReply && !replyOpen ? (
            /* Existing reply display */
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-secondary/60">
                <CornerDownRight className="w-3.5 h-3.5" /> 내 답글
              </div>
              <p className="text-sm text-secondary bg-white rounded-xl px-3 py-2.5 border border-emerald-200">{staffReply}</p>
              <button
                onClick={() => { setReplyText(staffReply); setReplyOpen(true); }}
                className="text-xs font-bold text-emerald-600 underline underline-offset-2"
              >
                수정하기
              </button>
            </div>
          ) : replyOpen ? (
            /* Reply editing mode */
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-secondary/60">
                <CornerDownRight className="w-3.5 h-3.5" /> 답글 작성
              </div>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="관리자 코멘트에 답글을 남기세요..."
                className="w-full rounded-xl border border-emerald-300 bg-white p-3 text-sm text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400/40 min-h-[5rem]"
                data-testid={`textarea-reply-${testId}`}
              />
              <div className="flex gap-2">
                <button
                  onClick={async () => { await onReply(replyText); setReplyOpen(false); }}
                  disabled={isReplying || !replyText.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                  data-testid={`btn-send-reply-${testId}`}
                >
                  {isReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  전송
                </button>
                <button onClick={() => setReplyOpen(false)} className="px-4 py-2.5 rounded-xl bg-muted text-muted-foreground font-bold text-sm active:scale-[0.98]">
                  취소
                </button>
              </div>
            </div>
          ) : (
            /* No reply yet — show write button */
            <button
              onClick={() => setReplyOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-600 font-bold text-sm hover:bg-emerald-100 active:scale-[0.98] transition-all"
              data-testid={`btn-open-reply-${testId}`}
            >
              <CornerDownRight className="w-4 h-4" /> 답글 남기기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
