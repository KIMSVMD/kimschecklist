import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { useChecklists, useDeleteChecklist } from "@/hooks/use-checklists";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Filter, Image as ImageIcon, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ['전체', '농산', '수산', '축산', '공산'];
const BRANCHES = ['전체', '강서', '강남', '송파', '야탑', '분당', '대전', '해운대', '괴정']; // Simplified for filter

export default function Dashboard() {
  const [filterBranch, setFilterBranch] = useState('전체');
  const [filterCategory, setFilterCategory] = useState('전체');
  const { toast } = useToast();
  const deleteMutation = useDeleteChecklist();

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

  return (
    <Layout title="관리자 대시보드" showBack={true}>
      <div className="flex flex-col h-full bg-background">
        
        {/* Filters Sticky Header */}
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
              {BRANCHES.map(b => <option key={b} value={b}>{b} 지점</option>)}
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

        {/* List Content */}
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
              const statusColors = {
                excellent: 'bg-blue-100 text-blue-700',
                average: 'bg-amber-100 text-amber-700',
                poor: 'bg-red-100 text-primary border-primary font-bold'
              };
              const statusLabels = {
                excellent: '우수',
                average: '보통',
                poor: '미흡'
              };

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={item.id}
                  className={`bg-white rounded-3xl overflow-hidden shadow-lg shadow-black/5 transition-all
                    ${isPoor ? 'border-2 border-primary' : 'border border-border/50 hover:shadow-xl'}`}
                >
                  {/* Photo area */}
                  {item.photoUrl ? (
                    <div className="w-full h-48 bg-muted relative">
                      <img src={item.photoUrl} alt="Checklist" className="w-full h-full object-cover" />
                      {isPoor && (
                        <div className="absolute top-3 left-3 bg-primary text-white px-3 py-1 rounded-full text-sm font-bold shadow-md flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> 긴급 조치 요망
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-muted/50 flex flex-col items-center justify-center text-muted-foreground border-b border-border/50">
                      <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-sm font-medium">사진 없음</span>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-primary mb-1 bg-primary/10 w-max px-2 py-0.5 rounded-md">
                          {item.category}
                        </span>
                        <h3 className="text-xl font-black text-secondary leading-tight">
                          {item.branch}점 <span className="font-medium text-muted-foreground text-lg ml-1">| {item.product}</span>
                        </h3>
                      </div>
                      <div className={`px-3 py-1.5 rounded-xl text-sm ${statusColors[item.status as keyof typeof statusColors]}`}>
                        {statusLabels[item.status as keyof typeof statusLabels]}
                      </div>
                    </div>

                    {item.items && Object.keys(item.items as object).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {Object.entries(item.items as Record<string, string>).map(([name, status]) => (
                          <span key={name} className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            status === 'excellent' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                            status === 'average' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                            'bg-red-50 border-red-200 text-red-600'
                          }`}>
                            {name}: {status === 'excellent' ? '우수' : status === 'average' ? '보통' : '미흡'}
                          </span>
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
              )
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
