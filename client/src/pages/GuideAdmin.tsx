import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import {
  useGuides,
  useAdminStatus,
  useAdminLogout,
  useCreateGuide,
  useUpdateGuide,
  useDeleteGuide,
} from "@/hooks/use-guides";
import type { Guide } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  LogOut,
  Loader2,
  X,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const CATEGORIES = ['농산', '수산', '축산', '공산'];

const PRODUCTS: Record<string, string[]> = {
  '농산': ['[시즌]딸기', '[시즌]만감류', '[시즌]오렌지', '[시즌]참외', '[시즌]수박', '[시즌]복숭아', '[시즌]사과', '[시즌]배', '[시즌]포도', '[시즌]감', '[시즌]감귤', '[데일리]토마토', '[데일리]사과', '[수입]바나나', '[수입]수입과일', '[수입]키위', '[채소]제주채소', '[양곡]'],
  '수산': ['[견과]', '[간편식]'],
  '축산': ['[돈육]', '[한우]암소한우', '[한우]시즈닝 스테이크', '[수입육]', '[양념육]', '[계육]'],
  '공산': ['[직수입]', '[건기식]', '[공산행사장]'],
};

type GuideFormData = {
  category: string;
  product: string;
  points: string[];
  items: string[];
  imageFile?: File | null;
  imageUrl?: string;
};

function GuideForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: Partial<GuideFormData & { id: number }>;
  onSave: (data: GuideFormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<GuideFormData>({
    category: initial?.category || '농산',
    product: initial?.product || '',
    points: initial?.points || [''],
    items: initial?.items || [''],
    imageFile: null,
    imageUrl: initial?.imageUrl || '',
  });
  const [previewUrl, setPreviewUrl] = useState<string>(initial?.imageUrl || '');
  const fileRef = useRef<HTMLInputElement>(null);

  const products = PRODUCTS[form.category] || [];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm(f => ({ ...f, imageFile: file }));
    setPreviewUrl(URL.createObjectURL(file));
  };

  const updateListItem = (field: 'points' | 'items', idx: number, val: string) => {
    setForm(f => {
      const arr = [...f[field]];
      arr[idx] = val;
      return { ...f, [field]: arr };
    });
  };

  const addListItem = (field: 'points' | 'items') => {
    setForm(f => ({ ...f, [field]: [...f[field], ''] }));
  };

  const removeListItem = (field: 'points' | 'items', idx: number) => {
    setForm(f => {
      const arr = [...f[field]];
      arr.splice(idx, 1);
      return { ...f, [field]: arr.length > 0 ? arr : [''] };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-muted/30 rounded-3xl border border-border">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-secondary">대분류</label>
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value, product: '' }))}
            className="w-full px-4 py-3 rounded-xl border-2 border-border text-base focus:outline-none focus:border-primary"
            data-testid="select-guide-category"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-secondary">상품명</label>
          <select
            value={form.product}
            onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border-2 border-border text-base focus:outline-none focus:border-primary"
            data-testid="select-guide-product"
          >
            <option value="">선택하세요</option>
            {products.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-secondary">표준 진열 가이드 이미지</label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center overflow-hidden active:scale-[0.98] transition-all aspect-video relative"
          data-testid="button-guide-image"
        >
          {previewUrl ? (
            <img src={previewUrl} className="absolute inset-0 w-full h-full object-contain" alt="Preview" />
          ) : (
            <>
              <ImageIcon className="w-10 h-10 text-primary/40 mb-2" />
              <span className="text-sm text-muted-foreground">이미지 업로드</span>
            </>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
      </div>

      {(['points', 'items'] as const).map((field) => (
        <div key={field} className="space-y-3">
          <label className="text-sm font-bold text-secondary">
            {field === 'points' ? '진열 핵심 포인트' : '진열 상태 평가 항목'}
          </label>
          <div className="space-y-2">
            {form[field].map((val, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={val}
                  onChange={e => updateListItem(field, idx, e.target.value)}
                  placeholder={`항목 ${idx + 1}`}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-border text-base focus:outline-none focus:border-primary"
                  data-testid={`input-${field}-${idx}`}
                />
                <button type="button" onClick={() => removeListItem(field, idx)} className="p-3 rounded-xl bg-muted text-muted-foreground hover:text-primary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addListItem(field)}
              className="w-full py-3 rounded-xl border-2 border-dashed border-primary/30 text-primary font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> 항목 추가
            </button>
          </div>
        </div>
      ))}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 rounded-2xl bg-muted text-secondary font-bold text-lg active:scale-[0.98] transition-all"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isPending || !form.product}
          className="flex-1 py-4 rounded-2xl bg-primary text-white font-black text-lg shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          data-testid="button-guide-save"
        >
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "저장"}
        </button>
      </div>
    </form>
  );
}

export default function GuideAdmin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: adminStatus, isLoading: authLoading } = useAdminStatus();
  const { data: guides, isLoading } = useGuides();
  const logoutMutation = useAdminLogout();
  const createMutation = useCreateGuide();
  const updateMutation = useUpdateGuide();
  const deleteMutation = useDeleteGuide();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !adminStatus?.isAdmin) {
      setLocation('/admin/login');
    }
  }, [authLoading, adminStatus?.isAdmin, setLocation]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  if (!adminStatus?.isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  const buildFormData = (data: ReturnType<typeof Object.assign>) => {
    const fd = new FormData();
    fd.append('category', data.category);
    fd.append('product', data.product);
    fd.append('points', JSON.stringify(data.points.filter((p: string) => p.trim())));
    fd.append('items', JSON.stringify(data.items.filter((i: string) => i.trim())));
    if (data.imageFile) fd.append('image', data.imageFile);
    return fd;
  };

  const handleCreate = async (data: any) => {
    try {
      await createMutation.mutateAsync(buildFormData(data));
      setShowAddForm(false);
      toast({ title: "가이드 추가 완료!" });
    } catch (err: any) {
      toast({ title: "저장 실패", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdate = async (id: number, data: any) => {
    try {
      await updateMutation.mutateAsync({ id, formData: buildFormData(data) });
      setEditingId(null);
      toast({ title: "가이드 수정 완료!" });
    } catch (err: any) {
      toast({ title: "수정 실패", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, product: string) => {
    if (!confirm(`"${product}" 가이드를 삭제하시겠습니까?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "삭제 완료" });
    } catch (err: any) {
      toast({ title: "삭제 실패", description: err.message, variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    setLocation('/');
  };

  const categoryColor: Record<string, string> = {
    '농산': 'bg-green-100 text-green-700',
    '수산': 'bg-blue-100 text-blue-700',
    '축산': 'bg-orange-100 text-orange-700',
    '공산': 'bg-purple-100 text-purple-700',
  };

  return (
    <Layout title="진열 가이드 관리" showBack={false}>
      <div className="flex flex-col h-full bg-background">
        {/* Header actions */}
        <div className="px-6 pt-4 pb-3 flex items-center justify-between border-b border-border">
          <p className="text-muted-foreground text-sm">VMD 관리자 전용</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-secondary font-bold text-sm active:scale-[0.97] transition-all"
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4" /> 로그아웃
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Add new button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-5 rounded-2xl border-2 border-dashed border-primary/40 text-primary font-black text-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-primary/5"
              data-testid="button-add-guide"
            >
              <Plus className="w-7 h-7" /> 새 가이드 추가
            </button>
          )}

          {showAddForm && (
            <GuideForm
              onSave={handleCreate}
              onCancel={() => setShowAddForm(false)}
              isPending={createMutation.isPending}
            />
          )}

          {/* Guide list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : (guides || []).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-lg">
              등록된 가이드가 없습니다.<br />새 가이드를 추가해주세요.
            </div>
          ) : (
            <div className="space-y-4">
              {(guides || []).map((guide: Guide) => (
                <div
                  key={guide.id}
                  className="bg-white rounded-3xl border-2 border-border shadow-sm overflow-hidden"
                  data-testid={`card-guide-${guide.id}`}
                >
                  {editingId === guide.id ? (
                    <div className="p-4">
                      <GuideForm
                        initial={{
                          category: guide.category,
                          product: guide.product,
                          points: guide.points as string[],
                          items: guide.items as string[],
                          imageUrl: guide.imageUrl || '',
                        }}
                        onSave={(data) => handleUpdate(guide.id, data)}
                        onCancel={() => setEditingId(null)}
                        isPending={updateMutation.isPending}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center p-4 gap-3">
                        {guide.imageUrl && (
                          <img
                            src={guide.imageUrl}
                            alt={guide.product}
                            className="w-16 h-16 rounded-xl object-cover border border-border shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${categoryColor[guide.category] || 'bg-muted text-secondary'}`}>
                              {guide.category}
                            </span>
                          </div>
                          <p className="text-lg font-black text-secondary truncate">{guide.product}</p>
                          <p className="text-sm text-muted-foreground">평가항목 {(guide.items as string[]).filter(Boolean).length}개</p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => setEditingId(guide.id)}
                            className="p-2.5 rounded-xl bg-muted text-secondary hover:text-primary transition-colors"
                            data-testid={`button-edit-guide-${guide.id}`}
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(guide.id, guide.product)}
                            className="p-2.5 rounded-xl bg-muted text-secondary hover:text-red-500 transition-colors"
                            data-testid={`button-delete-guide-${guide.id}`}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => setExpandedId(expandedId === guide.id ? null : guide.id)}
                        className="w-full px-4 pb-3 flex items-center justify-between text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <span>핵심 포인트 보기</span>
                        {expandedId === guide.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {expandedId === guide.id && (
                        <div className="px-4 pb-4 space-y-1 border-t border-border pt-3">
                          {(guide.points as string[]).filter(Boolean).map((point, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs shrink-0 mt-0.5">{i+1}</span>
                              <span className="text-secondary">{point}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
