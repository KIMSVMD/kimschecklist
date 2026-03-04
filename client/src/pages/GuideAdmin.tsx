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
import { queryClient } from "@/lib/queryClient";
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
  Download,
  Upload,
  RefreshCw,
} from "lucide-react";

const CATEGORIES = ['농산', '수산', '축산', '공산'];

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
  const [selectedGroup, setSelectedGroup] = useState<string>(() => {
    if (initial?.product) {
      const m = initial.product.match(/\[(.*?)\]/);
      return m ? m[1] : '';
    }
    return '';
  });
  const fileRef = useRef<HTMLInputElement>(null);

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const res = await fetch('/api/admin/guides/export', { credentials: 'include' });
      if (!res.ok) throw new Error('내보내기 실패');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guides-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `가이드 ${data.length}개 내보내기 완료` });
    } catch {
      toast({ title: '내보내기 실패', variant: 'destructive' });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSyncing(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch('/api/admin/guides/import', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      if (!res.ok) throw new Error('가져오기 실패');
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ['/api/guides'] });
      toast({ title: `가이드 동기화 완료`, description: `신규 ${result.created}개, 업데이트 ${result.updated}개` });
    } catch {
      toast({ title: '가져오기 실패', description: 'JSON 파일을 확인해주세요', variant: 'destructive' });
    } finally {
      setIsSyncing(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!authLoading && !adminStatus?.isAdmin) {
      setLocation('/admin/login');
    }
  }, [authLoading, adminStatus?.isAdmin, setLocation]);

  if (authLoading || !adminStatus?.isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  const buildPayload = async (data: any) => {
    let imageUrl = data.imageUrl || undefined;
    if (data.imageFile) {
      const { uploadFile } = await import("@/lib/upload");
      imageUrl = await uploadFile(data.imageFile);
    }
    return {
      category: data.category,
      product: data.product,
      points: data.points.filter((p: string) => p.trim()),
      items: data.items.filter((i: string) => i.trim()),
      imageUrl: imageUrl || null,
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
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-5 rounded-2xl border-2 border-dashed border-primary/40 text-primary font-bold text-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-primary/5"
                  data-testid="button-add-guide"
                >
                  <Plus className="w-7 h-7" /> 새 가이드 추가
                </button>
              )}

              {/* 데이터 동기화 */}
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-sm font-bold text-secondary mb-3 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> 데이터 동기화
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  미리보기(개발)↔배포 환경 간 가이드를 동기화합니다.<br />
                  ① 미리보기에서 <b>내보내기</b> → JSON 저장<br />
                  ② 배포 링크에서 <b>가져오기</b> → JSON 업로드
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleExport}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-border font-bold text-sm text-secondary active:scale-[0.97] transition-all"
                    data-testid="button-export-guides"
                  >
                    <Download className="w-4 h-4" /> 내보내기
                  </button>
                  <button
                    onClick={() => importInputRef.current?.click()}
                    disabled={isSyncing}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold text-sm active:scale-[0.97] transition-all disabled:opacity-50"
                    data-testid="button-import-guides"
                  >
                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    가져오기
                  </button>
                </div>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                  data-testid="input-import-file"
                />
              </div>

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
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
