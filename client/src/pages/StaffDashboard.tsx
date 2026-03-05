import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { useChecklists, useDeleteChecklist, useConfirmChecklistComment } from "@/hooks/use-checklists";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ClipboardList, Image as ImageIcon, AlertCircle, Pencil, Trash2, MapPin, MessageSquare, CheckCheck, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const REGIONS: Record<string, string[]> = {
  '수도권': ['강서', '강남', '송파', '야탑', '분당', '신구로', '구의', '불광', '평촌', '부천', '일산', '광명', '동수원', '산본', '중계', '고잔', '김포', '인천'],
  '지방': ['대전', '해운대', '괴정', '쇼핑', '수성'],
};
const ALL_BRANCHES = [...REGIONS['수도권'], ...REGIONS['지방']];
const CATEGORIES = ['전체', '농산', '수산', '축산', '공산'];

export default function StaffDashboard() {
  const [filterBranch, setFilterBranch] = useState('');
  const [filterCategory, setFilterCategory] = useState('전체');
  const { toast } = useToast();
  const deleteMutation = useDeleteChecklist();
  const confirmMutation = useConfirmChecklistComment();

  const handleConfirm = async (id: number) => {
    try {
      await confirmMutation.mutateAsync(id);
      toast({ title: "확인 완료!", description: "관리자 코멘트를 확인했습니다." });
    } catch {
      toast({ title: "처리 실패", variant: "destructive" });
    }
  };

  const { data: checklists, isLoading } = useChecklists({
    branch: filterBranch || undefined,
    category: filterCategory !== '전체' ? filterCategory : undefined,
  });

  const handleDelete = async (id: number, label: string) => {
    if (!confirm(`"${label}" 점검 기록을 삭제하시겠습니까?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
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
  const statusLabels = {
    excellent: '우수',
    average: '보통',
    poor: '미흡',
  };

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

          {/* Category filter */}
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
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!filterBranch ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center space-y-3">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <MapPin className="w-10 h-10 text-primary/60" />
              </div>
              <p className="font-bold text-xl text-secondary">지점을 선택해주세요</p>
              <p className="text-base">내 점검 목록을 확인할 지점을 먼저 선택하세요</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
              불러오는 중...
            </div>
          ) : !checklists?.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <ClipboardList className="w-8 h-8 opacity-40" />
              </div>
              <p className="font-medium text-lg">등록된 점검 기록이 없습니다</p>
              <Link href="/checklist/new">
                <button className="px-6 py-3 rounded-2xl bg-primary text-white font-bold text-base">
                  새 점검 등록하기
                </button>
              </Link>
            </div>
          ) : (
            checklists.map((item, index) => {
              const isPoor = item.status === 'poor';
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
                  {/* Photo */}
                  {item.photoUrl ? (
                    <div className="w-full h-44 bg-muted relative">
                      <img src={item.photoUrl} alt="현장사진" className="w-full h-full object-cover" />
                      {isPoor && (
                        <div className="absolute top-3 left-3 bg-primary text-white px-3 py-1 rounded-full text-sm font-bold shadow-md flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> 미흡 — 조치 필요
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-28 bg-muted/50 flex flex-col items-center justify-center text-muted-foreground border-b border-border/50">
                      <ImageIcon className="w-7 h-7 mb-1 opacity-40" />
                      <span className="text-xs font-medium">사진 없음</span>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          {item.category}
                        </span>
                        <h3 className="text-xl font-black text-secondary mt-1">
                          {item.product}
                        </h3>
                      </div>
                      <span className={`px-3 py-1.5 rounded-xl text-sm border ${statusColors[item.status as keyof typeof statusColors]}`}>
                        {statusLabels[item.status as keyof typeof statusLabels]}
                      </span>
                    </div>

                    {/* Item tags */}
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

                    {/* Admin comment */}
                    {(item as any).adminComment && (
                      <div className={`mb-4 rounded-2xl border-2 overflow-hidden ${
                        (item as any).commentConfirmed
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-amber-200 bg-amber-50'
                      }`}>
                        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                          <MessageSquare className={`w-4 h-4 ${(item as any).commentConfirmed ? 'text-emerald-600' : 'text-amber-600'}`} />
                          <span className={`text-xs font-black uppercase tracking-wide ${(item as any).commentConfirmed ? 'text-emerald-600' : 'text-amber-600'}`}>
                            관리자 코멘트
                          </span>
                          {(item as any).commentConfirmed && (
                            <span className="ml-auto text-xs font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCheck className="w-3.5 h-3.5" /> 확인완료
                            </span>
                          )}
                        </div>
                        <p className="px-4 pb-3 text-secondary text-sm font-medium leading-relaxed">
                          {(item as any).adminComment}
                        </p>
                        {!(item as any).commentConfirmed && (
                          <div className="px-4 pb-4">
                            <button
                              onClick={() => handleConfirm(item.id)}
                              disabled={confirmMutation.isPending}
                              className="w-full py-3 rounded-xl bg-amber-500 text-white font-black text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                              data-testid={`btn-confirm-comment-${item.id}`}
                            >
                              {confirmMutation.isPending
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <CheckCheck className="w-5 h-5" />}
                              확인했습니다
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <Link href={`/checklist/edit/${item.id}`} className="flex-1">
                        <button
                          className="w-full py-4 rounded-2xl border-2 border-border bg-muted text-secondary font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:border-primary/40 hover:text-primary"
                          data-testid={`button-edit-staff-${item.id}`}
                        >
                          <Pencil className="w-5 h-5" /> 수정
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id, item.product)}
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
          )}
        </div>
      </div>
    </Layout>
  );
}
