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
import { useProducts, useCreateProduct, useDeleteProduct } from "@/hooks/use-products";
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
  BarChart3,
  Package,
  BookOpen,
  Video,
  Upload,
} from "lucide-react";

const CATEGORIES = ['농산', '수산', '축산', '공산'];

type GuideFormData = {
  category: string;
  product: string;
  storeType?: string | null;
  guideType: 'vm' | 'ad';
  points: string[];
  items: string[];
  existingImageUrls: string[];
  newImageFiles: File[];
  videoFile?: File | null;
  videoUrl?: string;
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
  const getInitialImageUrls = () => {
    const urls = (initial as any)?.imageUrls as string[] | null;
    if (urls && urls.length > 0) return urls;
    const single = (initial as any)?.imageUrl as string | null;
    return single ? [single] : [];
  };

  const [form, setForm] = useState<GuideFormData>({
    category: initial?.category || '농산',
    product: initial?.product || '',
    storeType: initial?.storeType ?? null,
    guideType: (initial as any)?.guideType || 'vm',
    points: initial?.points || [''],
    items: initial?.items || [''],
    existingImageUrls: getInitialImageUrls(),
    newImageFiles: [],
    videoFile: null,
    videoUrl: (initial as any)?.videoUrl || '',
    _validFromYear: (initial as any)?.validFromYear ?? null,
    _validFromMonth: (initial as any)?.validFromMonth ?? null,
    _validToYear: (initial as any)?.validToYear ?? null,
    _validToMonth: (initial as any)?.validToMonth ?? null,
  } as any);
  const [videoFileName, setVideoFileName] = useState<string>(() => {
    const url = (initial as any)?.videoUrl;
    return url ? '영상 등록됨' : '';
  });
  const [selectedGroup, setSelectedGroup] = useState<string>(() => {
    if (initial?.product) {
      const m = initial.product.match(/\[(.*?)\]/);
      return m ? m[1] : '';
    }
    return '';
  });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const { data: dbProducts = [] } = useProducts(form.category);

  const groups = [...new Set(dbProducts.map(p => p.groupName))];
  const subProducts = dbProducts.filter(p => p.groupName === selectedGroup && p.productName);

  const handleGroupChange = (group: string) => {
    setSelectedGroup(group);
    const noSub = dbProducts.filter(p => p.groupName === group && !p.productName).length > 0;
    const hasSub = dbProducts.filter(p => p.groupName === group && p.productName).length > 0;
    if (noSub && !hasSub) {
      setForm(f => ({ ...f, product: `[${group}]` }));
    } else {
      setForm(f => ({ ...f, product: '' }));
    }
  };

  const handleProductChange = (productName: string) => {
    setForm(f => ({ ...f, product: `[${selectedGroup}]${productName}` }));
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setForm(f => ({ ...f, newImageFiles: [...f.newImageFiles, ...files] }));
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const removeExistingImage = (idx: number) => {
    setForm(f => ({ ...f, existingImageUrls: f.existingImageUrls.filter((_, i) => i !== idx) }));
  };

  const removeNewImage = (idx: number) => {
    setForm(f => ({ ...f, newImageFiles: f.newImageFiles.filter((_, i) => i !== idx) }));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm(f => ({ ...f, videoFile: file, videoUrl: '' }));
    setVideoFileName(file.name);
  };

  const handleRemoveVideo = () => {
    setForm(f => ({ ...f, videoFile: null, videoUrl: '' }));
    setVideoFileName('');
    if (videoRef.current) videoRef.current.value = '';
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

  const currentProductName = form.product
    ? form.product.replace(/\[.*?\]/, '') || selectedGroup
    : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-4 bg-muted/30 rounded-3xl border border-border">
      <div className="space-y-2">
        <label className="text-sm font-bold text-secondary">대분류</label>
        <select
          value={form.category}
          onChange={e => { setForm(f => ({ ...f, category: e.target.value, product: '' })); setSelectedGroup(''); }}
          className="w-full px-4 py-3 rounded-xl border-2 border-border text-base focus:outline-none focus:border-primary"
          data-testid="select-guide-category"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-bold text-secondary">그룹</label>
          <select
            value={selectedGroup}
            onChange={e => handleGroupChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-border text-base focus:outline-none focus:border-primary"
          >
            <option value="">그룹 선택</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-secondary">세부상품</label>
          {subProducts.length > 0 ? (
            <select
              value={currentProductName}
              onChange={e => handleProductChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-border text-base focus:outline-none focus:border-primary"
              data-testid="select-guide-product"
            >
              <option value="">상품 선택</option>
              {subProducts.map(p => <option key={p.id} value={p.productName!}>{p.productName}</option>)}
            </select>
          ) : (
            <div className="w-full px-4 py-3 rounded-xl border-2 border-border/50 bg-muted text-muted-foreground text-base">
              {selectedGroup ? '단일 상품' : '그룹 먼저 선택'}
            </div>
          )}
        </div>
      </div>

      {form.product && (
        <div className="px-4 py-2 bg-primary/10 rounded-xl text-primary font-bold text-sm">
          선택된 상품: <span className="font-black">{form.product}</span>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-bold text-secondary">가이드 종류</label>
        <div className="flex gap-2">
          {([['vm', 'VM 진열'], ['ad', '광고']] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setForm(f => ({ ...f, guideType: val }))}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 border-2 ${
                form.guideType === val
                  ? val === 'ad' ? 'bg-amber-500 text-white border-amber-500' : 'bg-primary text-white border-primary'
                  : 'bg-muted text-muted-foreground border-transparent'
              }`}
              data-testid={`btn-guide-type-${val}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-secondary">점포 유형 (선택)</label>
        <div className="flex gap-2">
          {(['전체(공통)', '대형점', '중소형점'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setForm(f => ({ ...f, storeType: t === '전체(공통)' ? null : t }))}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 border-2 ${
                (t === '전체(공통)' && !form.storeType) || form.storeType === t
                  ? 'bg-primary text-white border-primary'
                  : 'bg-muted text-muted-foreground border-transparent'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {form.storeType && (
          <p className="text-xs text-muted-foreground">같은 상품에 대형점·중소형점 가이드를 각각 등록하면 점검 시 선택 가능합니다.</p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-secondary">
            가이드 이미지 <span className="text-xs text-muted-foreground font-normal">(여러 장 등록 가능)</span>
          </label>
          <span className="text-xs text-muted-foreground">
            {form.existingImageUrls.length + form.newImageFiles.length}장
          </span>
        </div>

        {/* Existing images */}
        {form.existingImageUrls.map((url, idx) => (
          <div key={url} className="relative rounded-2xl overflow-hidden aspect-video border border-border bg-muted/20">
            <img src={url} className="w-full h-full object-contain bg-white" alt={`이미지 ${idx + 1}`} />
            <button
              type="button"
              onClick={() => removeExistingImage(idx)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-90 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">{idx + 1}</span>
          </div>
        ))}

        {/* New (pending upload) images */}
        {form.newImageFiles.map((file, idx) => (
          <div key={idx} className="relative rounded-2xl overflow-hidden aspect-video border-2 border-dashed border-primary/40 bg-primary/5">
            <img src={URL.createObjectURL(file)} className="w-full h-full object-contain bg-white" alt={`새 이미지 ${idx + 1}`} />
            <button
              type="button"
              onClick={() => removeNewImage(idx)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-90 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="absolute bottom-2 left-2 bg-primary/80 text-white text-xs px-2 py-0.5 rounded-full">
              {form.existingImageUrls.length + idx + 1} · 미저장
            </span>
          </div>
        ))}

        {/* Add image button */}
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="w-full py-5 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          data-testid="button-guide-image"
        >
          <Plus className="w-5 h-5 text-primary/60" />
          <span className="text-sm text-primary/70 font-medium">이미지 추가</span>
        </button>
        <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagesChange} />
      </div>

      {form.guideType === 'ad' && (
        <div className="space-y-2">
          <label className="text-sm font-bold text-secondary">광고 영상 파일 <span className="text-xs text-muted-foreground font-normal">(mp4, mov 등)</span></label>
          {videoFileName ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border-2 border-amber-200">
              <Video className="w-6 h-6 text-amber-600 shrink-0" />
              <span className="flex-1 text-sm font-medium text-amber-800 truncate">{videoFileName}</span>
              <button type="button" onClick={handleRemoveVideo} className="p-1.5 rounded-lg bg-amber-200 text-amber-700 hover:bg-amber-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => videoRef.current?.click()}
              className="w-full py-5 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-all"
              data-testid="button-guide-video"
            >
              <Upload className="w-8 h-8 text-amber-400" />
              <span className="text-sm text-amber-600 font-medium">광고 영상 업로드</span>
            </button>
          )}
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
        </div>
      )}

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

function ProductManager() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState('축산');
  const [showForm, setShowForm] = useState(false);
  const [newGroup, setNewGroup] = useState('');
  const [newProduct, setNewProduct] = useState('');

  const { data: products = [], isLoading } = useProducts(activeCategory);
  const createMutation = useCreateProduct();
  const deleteMutation = useDeleteProduct();

  const groups = [...new Set(products.map(p => p.groupName))];

  const handleAdd = async () => {
    if (!newGroup.trim()) {
      toast({ title: "그룹명을 입력해주세요", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({
        category: activeCategory,
        groupName: newGroup.trim(),
        productName: newProduct.trim() || null,
      });
      toast({ title: "상품 추가 완료!" });
      setNewGroup('');
      setNewProduct('');
      setShowForm(false);
    } catch {
      toast({ title: "추가 실패", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, label: string) => {
    if (!confirm(`"${label}" 상품을 삭제하시겠습니까?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "삭제 완료" });
    } catch {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-5 py-3 rounded-2xl font-bold text-base transition-all active:scale-95 ${
              activeCategory === cat ? 'bg-primary text-white shadow-md' : 'bg-muted text-muted-foreground hover:text-secondary'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-5 rounded-2xl border-2 border-dashed border-primary/40 text-primary font-bold text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-primary/5"
          data-testid="button-add-product"
        >
          <Plus className="w-6 h-6" /> 상품 추가
        </button>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-muted/30 rounded-3xl border border-border p-5 space-y-4">
          <h3 className="font-bold text-secondary text-lg">새 상품 추가 — {activeCategory}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">그룹명 *</label>
              <input
                type="text"
                placeholder="예: 한우, 수입과일"
                value={newGroup}
                onChange={e => setNewGroup(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-border text-base focus:outline-none focus:border-primary"
                data-testid="input-new-group"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">세부 상품명 (선택)</label>
              <input
                type="text"
                placeholder="예: 망고, 암소한우"
                value={newProduct}
                onChange={e => setNewProduct(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-border text-base focus:outline-none focus:border-primary"
                data-testid="input-new-product"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">세부 상품명을 비워두면 그룹 자체가 하나의 상품이 됩니다 (예: 양곡, 돈육)</p>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="flex-1 py-4 rounded-2xl bg-muted text-secondary font-bold">취소</button>
            <button
              onClick={handleAdd}
              disabled={createMutation.isPending}
              className="flex-1 py-4 rounded-2xl bg-primary text-white font-black flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="button-save-product"
            >
              {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "추가"}
            </button>
          </div>
        </div>
      )}

      {/* Product list by group */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">등록된 상품이 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => {
            const groupProducts = products.filter(p => p.groupName === group);
            return (
              <div key={group} className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
                  <span className="font-black text-secondary text-base flex items-center gap-2">
                    <span className="w-2 h-5 bg-primary rounded-full inline-block" />
                    {group}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">{groupProducts.length}개</span>
                </div>
                <div className="divide-y divide-border/50">
                  {groupProducts.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3" data-testid={`row-product-${p.id}`}>
                      <div>
                        {p.productName ? (
                          <span className="text-base font-bold text-secondary">{p.productName}</span>
                        ) : (
                          <span className="text-base font-bold text-muted-foreground italic">단일 상품 (그룹 = 상품)</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(p.id, p.productName || group)}
                        disabled={deleteMutation.isPending}
                        className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50"
                        data-testid={`button-delete-product-${p.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
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

  const [activeTab, setActiveTab] = useState<'guides' | 'products'>('guides');
  const [guideCategory, setGuideCategory] = useState<string>('전체');
  const [guideTypeFilter, setGuideTypeFilter] = useState<'vm' | 'ad'>('vm');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  useEffect(() => {
    if (!authLoading && !adminStatus?.isAdmin) {
      setLocation('/admin/login');
    }
  }, [authLoading, adminStatus?.isAdmin, setLocation]);

  if (authLoading || !adminStatus?.isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  const buildPayload = async (data: any) => {
    const { uploadFile } = await import("@/lib/upload");

    // Upload new image files in parallel
    const uploadedUrls: string[] = await Promise.all(
      (data.newImageFiles as File[]).map((f: File) => uploadFile(f))
    );
    const allImageUrls = [...(data.existingImageUrls as string[]), ...uploadedUrls];

    let videoUrl = data.videoUrl || undefined;
    if (data.videoFile) {
      videoUrl = await uploadFile(data.videoFile);
    }

    return {
      category: data.category,
      product: data.product,
      storeType: data.storeType || null,
      guideType: data.guideType || 'vm',
      points: data.points.filter((p: string) => p.trim()),
      items: data.items.filter((i: string) => i.trim()),
      imageUrl: allImageUrls[0] || null,
      imageUrls: allImageUrls.length > 0 ? allImageUrls : null,
      videoUrl: videoUrl || null,
      validFromYear: (data as any)._validFromYear ?? null,
      validFromMonth: (data as any)._validFromMonth ?? null,
      validToYear: (data as any)._validToYear ?? null,
      validToMonth: (data as any)._validToMonth ?? null,
    };
  };

  const handleCreate = async (data: any) => {
    try {
      const payload = await buildPayload(data);
      await createMutation.mutateAsync(payload);
      setShowAddForm(false);
      toast({ title: "가이드 추가 완료!" });
    } catch (err: any) {
      toast({ title: "저장 실패", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdate = async (id: number, data: any) => {
    try {
      const payload = await buildPayload(data);
      await updateMutation.mutateAsync({ id, payload });
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
    <Layout title="관리자 메뉴" showBack={false}>
      <div className="flex flex-col h-full bg-background">
        {/* Top bar */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border gap-3">
          <a
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold text-sm active:scale-[0.97] transition-all border border-primary/20"
            data-testid="link-admin-dashboard"
          >
            <BarChart3 className="w-4 h-4" /> 대시보드
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-secondary font-bold text-sm active:scale-[0.97] transition-all"
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4" /> 로그아웃
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-3 bg-muted/50 border-b border-border">
          <button
            onClick={() => setActiveTab('guides')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-base transition-all ${
              activeTab === 'guides' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'
            }`}
            data-testid="tab-guides"
          >
            <BookOpen className="w-5 h-5" /> 가이드 관리
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-base transition-all ${
              activeTab === 'products' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'
            }`}
            data-testid="tab-products"
          >
            <Package className="w-5 h-5" /> 상품 관리
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'products' ? (
            <ProductManager />
          ) : (
            <>
              {/* Guide type filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => setGuideTypeFilter('vm')}
                  className={`flex-1 py-3 rounded-2xl font-bold text-base transition-all active:scale-95 border-2 ${
                    guideTypeFilter === 'vm' ? 'bg-primary text-white border-primary shadow-md' : 'bg-muted text-muted-foreground border-transparent'
                  }`}
                  data-testid="tab-guide-type-vm"
                >
                  VM 진열
                </button>
                <button
                  onClick={() => setGuideTypeFilter('ad')}
                  className={`flex-1 py-3 rounded-2xl font-bold text-base transition-all active:scale-95 border-2 ${
                    guideTypeFilter === 'ad' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-muted text-muted-foreground border-transparent'
                  }`}
                  data-testid="tab-guide-type-ad"
                >
                  📢 광고
                </button>
              </div>

              {/* Category filter */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {['전체', ...CATEGORIES].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setGuideCategory(cat)}
                    className={`shrink-0 px-5 py-3 rounded-2xl font-bold text-base transition-all active:scale-95 ${
                      guideCategory === cat ? 'bg-primary text-white shadow-md' : 'bg-muted text-muted-foreground hover:text-secondary'
                    }`}
                    data-testid={`tab-guide-category-${cat}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-5 rounded-2xl border-2 border-dashed border-primary/40 text-primary font-bold text-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-primary/5"
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

              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
              ) : (guides || []).filter((g: Guide) => {
                  if (guideCategory !== '전체' && g.category !== guideCategory) return false;
                  if (((g as any).guideType || 'vm') !== guideTypeFilter) return false;
                  return true;
                }).length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-lg">
                  {guideCategory} {guideTypeFilter === 'ad' ? '광고' : 'VM'} 가이드가 없습니다.<br />새 가이드를 추가해주세요.
                </div>
              ) : (
                <div className="space-y-4">
                  {(guides || []).filter((g: Guide) => {
                    if (guideCategory !== '전체' && g.category !== guideCategory) return false;
                    if (((g as any).guideType || 'vm') !== guideTypeFilter) return false;
                    return true;
                  }).map((guide: Guide) => (
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
                              storeType: guide.storeType,
                              guideType: ((guide as any).guideType || 'vm') as 'vm' | 'ad',
                              points: guide.points as string[],
                              items: guide.items as string[],
                              imageUrls: ((guide as any).imageUrls as string[] | null) || (guide.imageUrl ? [guide.imageUrl] : []),
                              videoUrl: (guide as any).videoUrl || '',
                              validFromYear: (guide as any).validFromYear ?? null,
                              validFromMonth: (guide as any).validFromMonth ?? null,
                              validToYear: (guide as any).validToYear ?? null,
                              validToMonth: (guide as any).validToMonth ?? null,
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
                              <div className="relative shrink-0">
                                <img
                                  src={guide.imageUrl}
                                  alt={guide.product}
                                  className="w-16 h-16 rounded-xl object-cover border border-border"
                                />
                                {(() => {
                                  const cnt = ((guide as any).imageUrls as string[] | null)?.length ?? 1;
                                  return cnt > 1 ? (
                                    <span className="absolute -bottom-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">
                                      {cnt}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${categoryColor[guide.category] || 'bg-muted text-secondary'}`}>
                                  {guide.category}
                                </span>
                                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${(guide as any).guideType === 'ad' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                                  {(guide as any).guideType === 'ad' ? '광고' : 'VM 진열'}
                                </span>
                                {(guide as any).videoUrl && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-700">
                                    <Video className="w-3 h-3" />영상
                                  </span>
                                )}
                              {guide.storeType && (
                                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-700">
                                    {guide.storeType}
                                  </span>
                                )}
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
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
