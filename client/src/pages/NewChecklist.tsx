import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useCreateChecklist, useUploadPhoto } from "@/hooks/use-checklists";
import { useGuidesByProduct } from "@/hooks/use-guides";
import { useProducts } from "@/hooks/use-products";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Package, Camera, CheckCircle2, XCircle,
  Image as ImageIcon, Loader2, ChevronRight, ChevronLeft, Droplets,
  Calendar, BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const REGIONS: Record<string, string[]> = {
  '수도권': ['강서', '강남', '송파', '야탑', '분당', '신구로', '구의', '불광', '평촌', '부천', '일산', '광명', '동수원', '산본', '중계', '고잔', '김포', '인천'],
  '지방': ['대전', '해운대', '괴정', '쇼핑', '수성'],
};
const CATEGORIES = ['농산', '수산', '축산', '공산'];

type VMStage = 'category' | 'group' | 'product' | 'items';

export default function NewChecklist() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [branch, setBranch] = useState('');
  const [activeTab, setActiveTab] = useState<'vm' | 'cleaning'>('vm');

  const nowDate = new Date();
  const [selYear, setSelYear] = useState(nowDate.getFullYear());
  const [selMonth, setSelMonth] = useState(nowDate.getMonth() + 1);

  const [vmStage, setVmStage] = useState<VMStage>('category');
  const [selCategory, setSelCategory] = useState('');
  const [selGroup, setSelGroup] = useState('');
  const [selProduct, setSelProduct] = useState('');
  const [items, setItems] = useState<Record<string, string>>({});
  const [photoUrl, setPhotoUrl] = useState('');
  const [notes, setNotes] = useState('');

  const currentYear = nowDate.getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const resetVm = () => {
    setVmStage('category');
    setSelCategory('');
    setSelGroup('');
    setSelProduct('');
    setItems({});
    setPhotoUrl('');
    setNotes('');
  };

  const handleTabChange = (tab: 'vm' | 'cleaning') => {
    setActiveTab(tab);
    if (tab === 'vm') resetVm();
  };

  const handleBack = () => {
    if (activeTab === 'cleaning' || vmStage === 'category') {
      window.history.back();
    } else if (vmStage === 'group') {
      setVmStage('category');
      setSelCategory('');
    } else if (vmStage === 'product') {
      setVmStage('group');
      setSelGroup('');
    } else if (vmStage === 'items') {
      setVmStage('product');
      setSelProduct('');
      setItems({});
      setPhotoUrl('');
      setNotes('');
    }
  };

  return (
    <Layout title="새 점검 등록" showBack={true} onBack={handleBack}>
      <div className="flex flex-col h-full bg-background">

        {/* ── Sticky filter header ── */}
        <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-border/50 p-4 space-y-3 shadow-sm">

          {/* Branch selector */}
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <select
              value={branch}
              onChange={e => { setBranch(e.target.value); resetVm(); }}
              className="flex-1 bg-muted border-none rounded-xl px-4 py-3 font-bold text-lg focus:ring-2 focus:ring-primary/50 outline-none text-secondary"
              data-testid="select-new-branch"
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
              onClick={() => handleTabChange('vm')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'vm' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'
              }`}
              data-testid="tab-new-vm"
            >
              <BarChart3 className="w-4 h-4" /> VM 점검
            </button>
            <button
              onClick={() => handleTabChange('cleaning')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'cleaning' ? 'bg-white text-emerald-600 shadow-sm' : 'text-muted-foreground'
              }`}
              data-testid="tab-new-cleaning"
            >
              <Droplets className="w-4 h-4" /> 청소 점검
            </button>
          </div>

          {/* Year/Month filter — VM tab */}
          {activeTab === 'vm' && (
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <select
                  value={selYear}
                  onChange={e => { setSelYear(Number(e.target.value)); resetVm(); }}
                  className="bg-muted border-none rounded-xl px-3 py-2 font-bold text-sm focus:ring-2 focus:ring-primary/50 outline-none text-secondary"
                >
                  {yearOptions.map(y => (
                    <option key={y} value={y}>{y}년</option>
                  ))}
                </select>
                {/* Breadcrumb for current selection */}
                {selCategory && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium overflow-hidden">
                    <span className="shrink-0 text-primary font-bold">{selCategory}</span>
                    {selGroup && <><ChevronRight className="w-3 h-3 shrink-0" /><span className="truncate">{selGroup}</span></>}
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <button
                    key={m}
                    onClick={() => { setSelMonth(m); resetVm(); }}
                    className={`shrink-0 px-3 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                      selMonth === m ? 'bg-primary text-white shadow-sm' : 'bg-muted text-muted-foreground hover:text-secondary'
                    }`}
                    data-testid={`btn-new-month-${m}`}
                  >
                    {m}월
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Content area ── */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* No branch selected */}
            {!branch ? (
              <motion.div key="no-branch"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center flex-1 text-muted-foreground text-center space-y-3 p-6 py-24"
              >
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                  <MapPin className="w-10 h-10 text-primary/60" />
                </div>
                <p className="font-bold text-xl text-secondary">지점을 선택해주세요</p>
                <p className="text-base">점검을 등록할 지점을 먼저 선택하세요</p>
              </motion.div>
            ) : activeTab === 'cleaning' ? (
              /* Cleaning tab */
              <motion.div key="cleaning"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-6"
              >
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Droplets className="w-10 h-10 text-emerald-600" />
                </div>
                <div>
                  <p className="font-black text-2xl text-secondary">{branch}점</p>
                  <p className="text-muted-foreground mt-1">매장 청소 점검을 시작하세요</p>
                </div>
                <button
                  onClick={() => setLocation(`/cleaning/new?branch=${encodeURIComponent(branch)}`)}
                  className="w-full max-w-xs py-5 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-black text-xl shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                  data-testid="btn-start-cleaning"
                >
                  <Droplets className="w-7 h-7" /> 청소 점검 시작
                </button>
              </motion.div>
            ) : (
              /* VM tab stages */
              <VMContent
                key="vm"
                branch={branch}
                selYear={selYear}
                selMonth={selMonth}
                vmStage={vmStage}
                setVmStage={setVmStage}
                selCategory={selCategory}
                setSelCategory={setSelCategory}
                selGroup={selGroup}
                setSelGroup={setSelGroup}
                selProduct={selProduct}
                setSelProduct={setSelProduct}
                items={items}
                setItems={setItems}
                photoUrl={photoUrl}
                setPhotoUrl={setPhotoUrl}
                notes={notes}
                setNotes={setNotes}
                onReset={resetVm}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}

// ─── VM Content ───────────────────────────────────────────────────────────────
type VMContentProps = {
  branch: string;
  selYear: number; selMonth: number;
  vmStage: VMStage; setVmStage: (s: VMStage) => void;
  selCategory: string; setSelCategory: (v: string) => void;
  selGroup: string; setSelGroup: (v: string) => void;
  selProduct: string; setSelProduct: (v: string) => void;
  items: Record<string, string>; setItems: (v: Record<string, string>) => void;
  photoUrl: string; setPhotoUrl: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  onReset: () => void;
};

function VMContent({ branch, selYear, selMonth, vmStage, setVmStage, selCategory, setSelCategory, selGroup, setSelGroup, selProduct, setSelProduct, items, setItems, photoUrl, setPhotoUrl, notes, setNotes, onReset }: VMContentProps) {
  const { data: dbProducts = [], isLoading } = useProducts(selCategory);
  const groups = Array.from(new Set(dbProducts.map(p => p.groupName)));

  return (
    <div className="p-4 space-y-4">
      {/* Stage back-nav */}
      {vmStage !== 'category' && (
        <button
          onClick={() => {
            if (vmStage === 'group') { setVmStage('category'); setSelCategory(''); }
            else if (vmStage === 'product') { setVmStage('group'); setSelGroup(''); }
            else if (vmStage === 'items') { setVmStage('product'); setSelProduct(''); }
          }}
          className="flex items-center gap-2 text-sm font-bold text-muted-foreground active:scale-95 transition-all py-1"
          data-testid="btn-vm-back"
        >
          <ChevronLeft className="w-4 h-4" />
          {vmStage === 'group' ? '카테고리 선택으로' : vmStage === 'product' ? '그룹 선택으로' : '상품 선택으로'} 돌아가기
        </button>
      )}

      <AnimatePresence mode="wait">
        {/* ── Category ── */}
        {vmStage === 'category' && (
          <motion.div key="cat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <div className="mb-5">
              <p className="text-xs font-bold text-primary mb-1">{selYear}년 {selMonth}월 · {branch}점 · VM 점검</p>
              <h2 className="text-2xl font-black text-secondary">카테고리 선택</h2>
            </div>
            {CATEGORIES.map(cat => (
              <button key={cat}
                onClick={() => { setSelCategory(cat); setSelGroup(''); setVmStage('group'); }}
                className="w-full flex items-center justify-between p-6 rounded-3xl border-2 border-border bg-white text-secondary hover:border-primary/50 shadow-sm active:scale-[0.98] transition-all"
                data-testid={`btn-new-category-${cat}`}
              >
                <span className="text-3xl font-bold">{cat}</span>
                <ChevronRight className="w-6 h-6 text-muted-foreground" />
              </button>
            ))}
          </motion.div>
        )}

        {/* ── Group ── */}
        {vmStage === 'group' && (
          <motion.div key="grp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <div className="mb-5">
              <p className="text-xs font-bold text-primary mb-1">{selYear}년 {selMonth}월 · {branch}점 · {selCategory}</p>
              <h2 className="text-2xl font-black text-secondary">상품 그룹 선택</h2>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
            ) : groups.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">등록된 상품 그룹이 없습니다</p>
              </div>
            ) : (
              groups.map(group => {
                const cnt = dbProducts.filter(p => p.groupName === group && p.productName).length;
                return (
                  <button key={group}
                    onClick={() => {
                      const subs = dbProducts.filter(p => p.groupName === group && p.productName);
                      if (subs.length === 0) {
                        setSelGroup(group); setSelProduct(`[${group}]`); setVmStage('items');
                      } else {
                        setSelGroup(group); setVmStage('product');
                      }
                    }}
                    className="w-full flex items-center justify-between p-5 min-h-[5rem] rounded-2xl border-2 border-border bg-white text-secondary hover:border-primary/40 active:scale-[0.98] shadow-sm transition-all"
                    data-testid={`btn-new-group-${group}`}
                  >
                    <span className="text-2xl font-bold">{group}</span>
                    <div className="flex items-center gap-2">
                      {cnt > 0 && <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg font-medium">{cnt}개</span>}
                      <ChevronRight className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </button>
                );
              })
            )}
          </motion.div>
        )}

        {/* ── Product ── */}
        {vmStage === 'product' && (
          <motion.div key="prod" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <div className="mb-5">
              <p className="text-xs font-bold text-primary mb-1">{selYear}년 {selMonth}월 · {branch}점 · {selCategory} · {selGroup}</p>
              <h2 className="text-2xl font-black text-secondary">상품 선택</h2>
            </div>
            {dbProducts.filter(p => p.groupName === selGroup && p.productName).map(p => (
              <button key={p.id}
                onClick={() => { setSelProduct(`[${selGroup}]${p.productName}`); setVmStage('items'); }}
                className="w-full flex items-center justify-between p-5 min-h-[5rem] rounded-2xl border-2 border-border bg-white text-secondary hover:border-primary/30 active:scale-[0.98] shadow-sm transition-all"
                data-testid={`btn-new-product-${p.id}`}
              >
                <span className="text-2xl font-bold">{p.productName}</span>
                <ChevronRight className="w-6 h-6 text-muted-foreground" />
              </button>
            ))}
          </motion.div>
        )}

        {/* ── Items form ── */}
        {vmStage === 'items' && (
          <ItemsForm
            key="items"
            branch={branch} selYear={selYear} selMonth={selMonth}
            selCategory={selCategory} selProduct={selProduct}
            items={items} setItems={setItems}
            photoUrl={photoUrl} setPhotoUrl={setPhotoUrl}
            notes={notes} setNotes={setNotes}
            onReset={onReset}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Items Form ───────────────────────────────────────────────────────────────
type ItemsFormProps = {
  branch: string; selYear: number; selMonth: number;
  selCategory: string; selProduct: string;
  items: Record<string, string>; setItems: (v: Record<string, string>) => void;
  photoUrl: string; setPhotoUrl: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  onReset: () => void;
};

function ItemsForm({ branch, selYear, selMonth, selCategory, selProduct, items, setItems, photoUrl, setPhotoUrl, notes, setNotes, onReset }: ItemsFormProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateChecklist();
  const uploadMutation = useUploadPhoto();
  const { data: allGuides = [], isLoading: guideLoading } = useGuidesByProduct(selProduct);
  const [selectedStoreType, setSelectedStoreType] = useState<string | null>(null);
  const storeTypeOptions = Array.from(new Set(allGuides.filter(g => g.storeType).map(g => g.storeType as string)));
  const hasStoreTypes = storeTypeOptions.length > 0;
  const dbGuide = hasStoreTypes
    ? (allGuides.find(g => g.storeType === (selectedStoreType || storeTypeOptions[0])) ?? allGuides[0])
    : allGuides[0] ?? null;
  const activeStoreType = hasStoreTypes ? (selectedStoreType || storeTypeOptions[0]) : null;
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalPreview(URL.createObjectURL(file));
    try {
      const url = await uploadMutation.mutateAsync(file);
      setPhotoUrl(url);
    } catch {
      toast({ title: "업로드 실패", variant: "destructive" });
      setLocalPreview(null);
    }
  };

  const submitForm = async () => {
    const hasNotok = Object.values(items).includes('notok');
    const finalStatus = hasNotok ? 'poor' : 'excellent';
    try {
      const created = await createMutation.mutateAsync({
        branch,
        category: selCategory,
        product: selProduct,
        status: finalStatus,
        photoUrl: photoUrl || null,
        notes: notes || null,
        items,
        year: selYear,
        month: selMonth,
      });
      toast({ title: "제출 완료!" });
      onReset();
      setLocation(`/checklist/edit/${created.id}`);
    } catch (err) {
      toast({ title: "제출 실패", description: String(err), variant: "destructive" });
    }
  };

  const guideImage = dbGuide?.imageUrl || null;
  const guidePoints: string[] = (dbGuide?.points as string[]) || [];
  const guideItems: string[] = (dbGuide?.items as string[])?.filter(Boolean) || [];
  const allItemsChecked = guideItems.length === 0 || guideItems.every(item => items[item]);

  const displayProduct = selProduct?.replace(/\[(.+?)\](.*)/, (_: string, g: string, rest: string) => rest ? `${g} > ${rest}` : g) || selProduct;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pb-10">
      <div className="border-b-2 border-border pb-4">
        <p className="text-xs text-muted-foreground font-medium">{branch}점 · {selCategory} · {selYear}년 {selMonth}월</p>
        <h2 className="text-xl font-black text-secondary mt-0.5">{displayProduct}</h2>
      </div>

      {/* Guide */}
      {guideLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : dbGuide ? (
        <div className="space-y-4">
          <div className="bg-secondary text-white rounded-3xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <ImageIcon className="text-primary w-6 h-6" />
                <h3 className="text-xl font-bold">표준 진열 가이드</h3>
              </div>
              {hasStoreTypes && (
                <div className="flex gap-1">
                  {storeTypeOptions.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedStoreType(t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        activeStoreType === t
                          ? 'bg-primary text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                      data-testid={`btn-store-type-${t}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {guideImage ? (
              <Dialog>
                <DialogTrigger asChild>
                  <button className="w-full rounded-2xl overflow-hidden aspect-video bg-muted/20 border border-white/10 relative group active:scale-[0.98] transition-all">
                    <img src={guideImage} alt="Guide" className="w-full h-full object-contain bg-white" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-white/90 text-secondary px-4 py-2 rounded-full font-bold text-sm">클릭하여 확대</span>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] w-full p-0 border-none bg-transparent shadow-none">
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <TransformWrapper initialScale={1} minScale={1} maxScale={4} centerOnInit>
                      <TransformComponent wrapperStyle={{ width: "100%", height: "90vh" }}>
                        <img src={guideImage} alt="Guide Full" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white mx-auto" />
                      </TransformComponent>
                    </TransformWrapper>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="w-full rounded-2xl aspect-video bg-muted/20 border border-white/10 flex items-center justify-center">
                <div className="text-center text-white/60"><ImageIcon className="w-10 h-10 mx-auto mb-2" /><p className="text-sm">이미지 없음</p></div>
              </div>
            )}
          </div>
          {guidePoints.length > 0 && (
            <div className="bg-muted/50 rounded-3xl border border-border p-5 space-y-3">
              <h4 className="text-lg font-bold text-secondary flex items-center gap-2">
                <div className="w-2 h-6 bg-primary rounded-full" />진열 핵심 포인트
              </h4>
              <div className="overflow-y-auto max-h-[200px] pr-2 space-y-2.5 scrollbar-thin scrollbar-thumb-primary/20">
                {guidePoints.map((point, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-border/50 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">{i+1}</div>
                    <p className="text-base font-medium text-secondary leading-tight">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-muted/30 rounded-3xl border border-border p-6 text-center text-muted-foreground">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>이 상품의 진열 가이드가 아직 등록되지 않았습니다.</p>
        </div>
      )}

      {/* Photo Upload */}
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-secondary">현장 사진 촬영</h3>
        <button onClick={() => fileInputRef.current?.click()}
          className="w-full relative aspect-video rounded-3xl border-4 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center overflow-hidden active:scale-[0.98] transition-all">
          {localPreview && <img src={localPreview} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />}
          {guideImage && !localPreview && (
            <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-multiply">
              <img src={guideImage} className="w-full h-full object-contain bg-white grayscale" alt="Overlay" />
            </div>
          )}
          <div className={`relative z-10 flex flex-col items-center p-6 rounded-2xl backdrop-blur-sm ${localPreview ? 'bg-black/50 text-white' : 'bg-white/80 text-primary'}`}>
            {uploadMutation.isPending ? <Loader2 className="w-12 h-12 animate-spin mb-2" /> : <Camera className="w-12 h-12 mb-2" />}
            <span className="font-bold text-lg">{localPreview ? '다시 촬영하기' : '탭하여 사진 업로드'}</span>
          </div>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {/* Per-item ○/✗ evaluation */}
      {guideItems.length > 0 && (
        <div className="space-y-5">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-secondary">항목별 가이드 일치 여부</h3>
            <p className="text-sm text-muted-foreground">진열 가이드와 일치하면 ○, 다르면 ✗를 선택하세요.</p>
          </div>
          {guideItems.map((item) => (
            <div key={item} className={`rounded-2xl border-2 overflow-hidden transition-all ${
              items[item] === 'ok' ? 'border-blue-300 bg-blue-50'
              : items[item] === 'notok' ? 'border-primary bg-red-50'
              : 'border-border bg-white'
            }`}>
              <div className="flex items-center justify-between p-4">
                <h4 className="text-base font-bold text-secondary flex-1 pr-3">{item}</h4>
                <div className="flex gap-3 shrink-0">
                  <button
                    onClick={() => setItems({ ...items, [item]: 'ok' })}
                    className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${
                      items[item] === 'ok' ? 'bg-blue-500 border-blue-600 text-white shadow-md' : 'bg-white border-border text-muted-foreground'
                    }`}
                    data-testid={`btn-item-ok-${item}`}
                  >
                    <CheckCircle2 className="w-8 h-8" />
                  </button>
                  <button
                    onClick={() => setItems({ ...items, [item]: 'notok' })}
                    className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${
                      items[item] === 'notok' ? 'bg-primary border-red-700 text-white shadow-md' : 'bg-white border-border text-muted-foreground'
                    }`}
                    data-testid={`btn-item-notok-${item}`}
                  >
                    <XCircle className="w-8 h-8" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-between text-sm font-medium text-muted-foreground">
            <span>{Object.keys(items).length} / {guideItems.length} 완료</span>
            {Object.values(items).includes('notok') && (
              <span className="text-primary font-bold">불일치 {Object.values(items).filter(v => v === 'notok').length}건</span>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-secondary">특이사항 (선택)</h3>
        <textarea
          placeholder="VM 집기 부족/파손/광고물 요청 등..."
          className="w-full p-5 rounded-2xl border-2 border-border bg-white text-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all min-h-[8rem] resize-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Submit */}
      <button
        onClick={submitForm}
        disabled={createMutation.isPending || uploadMutation.isPending || !allItemsChecked}
        className="w-full py-6 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-white font-black text-2xl shadow-xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
        data-testid="btn-submit-checklist"
      >
        {createMutation.isPending ? <Loader2 className="w-8 h-8 animate-spin" /> : "점검 완료 및 제출"}
      </button>
      {guideItems.length > 0 && !allItemsChecked && (
        <p className="text-center text-sm text-muted-foreground -mt-4">모든 항목을 선택해주세요</p>
      )}
    </motion.div>
  );
}
