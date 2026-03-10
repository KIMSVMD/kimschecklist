import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useCreateChecklist, useUploadPhoto, useChecklists } from "@/hooks/use-checklists";
import { useGuidesByProduct, useAdGuidesByProduct, useAllAdGuideProducts } from "@/hooks/use-guides";
import { useProducts } from "@/hooks/use-products";
import { useGuideNotifications, type GuideNotification } from "@/hooks/use-notifications";
import { useQuery } from "@tanstack/react-query";
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
  const [activeTab, setActiveTab] = useState<'vm' | 'ad' | 'cleaning'>('vm');

  const nowDate = new Date();
  const [selYear, setSelYear] = useState(nowDate.getFullYear());
  const [selMonth, setSelMonth] = useState(nowDate.getMonth() + 1);

  const [vmStage, setVmStage] = useState<VMStage>('category');
  const [selCategory, setSelCategory] = useState('');
  const [selGroup, setSelGroup] = useState('');
  const [selProduct, setSelProduct] = useState('');
  const [items, setItems] = useState<Record<string, string>>({});
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const currentYear = nowDate.getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  // Guide notifications — raw (not localStorage-filtered) for branch completion check
  const { data: guideNotifs = [] } = useQuery<GuideNotification[]>({
    queryKey: ['/api/guide-notifications'],
    refetchInterval: 60_000,
  });
  const { data: branchChecklists = [] } = useChecklists({ branch: branch || undefined });
  const { data: adGuideProducts = [] } = useAllAdGuideProducts();

  // Deduplicate by product: keep only the most recent notification per product
  const latestGuideNotifByProduct = guideNotifs.reduce<typeof guideNotifs>((acc, notif) => {
    if (!notif.product) return acc;
    const existing = acc.find(n => n.product === notif.product);
    if (!existing || new Date(notif.createdAt) > new Date(existing.createdAt)) {
      return [...acc.filter(n => n.product !== notif.product), notif];
    }
    return acc;
  }, []);

  // VM tab: pending if no vm-type checklist submitted this month
  const pendingGuideNotifs = latestGuideNotifByProduct.filter(notif => {
    if (!notif.product) return false;
    const notifDate = new Date(notif.createdAt);
    const notifYear = notifDate.getFullYear();
    const notifMonth = notifDate.getMonth() + 1;
    const alreadyDone = branchChecklists.some(c => {
      const cy = (c as any).year;
      const cm = (c as any).month;
      const ct = (c as any).checklistType || 'vm';
      return c.product === notif.product && cy === notifYear && cm === notifMonth && ct !== 'ad';
    });
    return !alreadyDone;
  });

  // Ad tab: pending only if product has an ad guide AND no ad-type checklist submitted this month
  const pendingAdGuideNotifs = latestGuideNotifByProduct.filter(notif => {
    if (!notif.product) return false;
    if (!adGuideProducts.includes(notif.product)) return false;
    const notifDate = new Date(notif.createdAt);
    const notifYear = notifDate.getFullYear();
    const notifMonth = notifDate.getMonth() + 1;
    const alreadyDone = branchChecklists.some(c => {
      const cy = (c as any).year;
      const cm = (c as any).month;
      const ct = (c as any).checklistType || 'vm';
      return c.product === notif.product && cy === notifYear && cm === notifMonth && ct === 'ad';
    });
    return !alreadyDone;
  });

  const handleGuideNotifClick = (notif: typeof guideNotifs[0]) => {
    if (!notif.product) return;
    const notifDate = new Date(notif.createdAt);
    setSelYear(notifDate.getFullYear());
    setSelMonth(notifDate.getMonth() + 1);
    const match = notif.product.match(/^\[([^\]]+)\](.*)/);
    const group = match ? match[1] : notif.product;
    setSelCategory(notif.category ?? '');
    setSelGroup(group);
    setSelProduct(notif.product);
    setItems({});
    setPhotoUrls([]);
    setNotes('');
    setVmStage('items');
  };

  const resetVm = () => {
    setVmStage('category');
    setSelCategory('');
    setSelGroup('');
    setSelProduct('');
    setItems({});
    setPhotoUrls([]);
    setNotes('');
  };

  const handleTabChange = (tab: 'vm' | 'ad' | 'cleaning') => {
    setActiveTab(tab);
    if (tab !== 'cleaning') resetVm();
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
      setPhotoUrls([]);
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
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'vm' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'
              }`}
              data-testid="tab-new-vm"
            >
              <BarChart3 className="w-4 h-4" /> VM 점검
            </button>
            <button
              onClick={() => handleTabChange('ad')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'ad' ? 'bg-white text-amber-600 shadow-sm' : 'text-muted-foreground'
              }`}
              data-testid="tab-new-ad"
            >
              <span className="text-base leading-none">📢</span> 광고 점검
            </button>
            <button
              onClick={() => handleTabChange('cleaning')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'cleaning' ? 'bg-white text-emerald-600 shadow-sm' : 'text-muted-foreground'
              }`}
              data-testid="tab-new-cleaning"
            >
              <Droplets className="w-4 h-4" /> 청소
            </button>
          </div>

          {/* Year/Month filter — VM / Ad tabs */}
          {(activeTab === 'vm' || activeTab === 'ad') && (
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
            ) : activeTab === 'ad' ? (
              /* Ad tab */
              <VMContent
                key="ad"
                adOnly={true}
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
                photoUrls={photoUrls}
                setPhotoUrls={setPhotoUrls}
                notes={notes}
                setNotes={setNotes}
                onReset={resetVm}
                pendingGuideNotifs={pendingAdGuideNotifs}
              />
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
                adOnly={false}
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
                photoUrls={photoUrls}
                setPhotoUrls={setPhotoUrls}
                notes={notes}
                setNotes={setNotes}
                onReset={resetVm}
                pendingGuideNotifs={pendingGuideNotifs}
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
  adOnly: boolean;
  branch: string;
  selYear: number; selMonth: number;
  vmStage: VMStage; setVmStage: (s: VMStage) => void;
  selCategory: string; setSelCategory: (v: string) => void;
  selGroup: string; setSelGroup: (v: string) => void;
  selProduct: string; setSelProduct: (v: string) => void;
  items: Record<string, string>; setItems: (v: Record<string, string>) => void;
  photoUrls: string[]; setPhotoUrls: (v: string[]) => void;
  notes: string; setNotes: (v: string) => void;
  onReset: () => void;
  pendingGuideNotifs: import('@/hooks/use-notifications').GuideNotification[];
};

function VMContent({ adOnly, branch, selYear, selMonth, vmStage, setVmStage, selCategory, setSelCategory, selGroup, setSelGroup, selProduct, setSelProduct, items, setItems, photoUrls, setPhotoUrls, notes, setNotes, onReset, pendingGuideNotifs }: VMContentProps) {
  const { data: dbProducts = [], isLoading } = useProducts(selCategory);
  const groups = Array.from(new Set(dbProducts.map(p => p.groupName)));

  const catBadge = (cat: string) => pendingGuideNotifs.filter(n => n.category === cat).length;
  const groupBadge = (grp: string) => pendingGuideNotifs.filter(n => n.product && (n.product === `[${grp}]` || n.product.startsWith(`[${grp}]`))).length;
  const productBadge = (product: string) => pendingGuideNotifs.filter(n => n.product === product).length > 0;

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
              <p className="text-xs font-bold text-primary mb-1">{selYear}년 {selMonth}월 · {branch}점 · {adOnly ? '광고 점검' : 'VM 점검'}</p>
              <h2 className="text-2xl font-black text-secondary">카테고리 선택</h2>
            </div>
            {CATEGORIES.map(cat => {
              const badge = catBadge(cat);
              return (
                <button key={cat}
                  onClick={() => { setSelCategory(cat); setSelGroup(''); setVmStage('group'); }}
                  className="w-full flex items-center justify-between p-6 rounded-3xl border-2 border-border bg-white text-secondary hover:border-primary/50 shadow-sm active:scale-[0.98] transition-all"
                  data-testid={`btn-new-category-${cat}`}
                >
                  <span className="text-3xl font-bold">{cat}</span>
                  <div className="flex items-center gap-2">
                    {badge > 0 && (
                      <span className="w-7 h-7 rounded-full bg-primary text-white text-sm font-black flex items-center justify-center">{badge}</span>
                    )}
                    <ChevronRight className="w-6 h-6 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
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
                const badge = groupBadge(group);
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
                      {badge > 0 && (
                        <span className="w-7 h-7 rounded-full bg-primary text-white text-sm font-black flex items-center justify-center">{badge}</span>
                      )}
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
            {dbProducts.filter(p => p.groupName === selGroup && p.productName).map(p => {
              const hasBadge = productBadge(`[${selGroup}]${p.productName}`);
              return (
                <button key={p.id}
                  onClick={() => { setSelProduct(`[${selGroup}]${p.productName}`); setVmStage('items'); }}
                  className="w-full flex items-center justify-between p-5 min-h-[5rem] rounded-2xl border-2 border-border bg-white text-secondary hover:border-primary/30 active:scale-[0.98] shadow-sm transition-all"
                  data-testid={`btn-new-product-${p.id}`}
                >
                  <span className="text-2xl font-bold">{p.productName}</span>
                  <div className="flex items-center gap-2">
                    {hasBadge && (
                      <span className="w-7 h-7 rounded-full bg-primary text-white text-sm font-black flex items-center justify-center">1</span>
                    )}
                    <ChevronRight className="w-6 h-6 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}

        {/* ── Items form ── */}
        {vmStage === 'items' && (
          <ItemsForm
            key="items"
            adOnly={adOnly}
            branch={branch} selYear={selYear} selMonth={selMonth}
            selCategory={selCategory} selProduct={selProduct}
            items={items} setItems={setItems}
            photoUrls={photoUrls} setPhotoUrls={setPhotoUrls}
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
  adOnly: boolean;
  branch: string; selYear: number; selMonth: number;
  selCategory: string; selProduct: string;
  items: Record<string, string>; setItems: (v: Record<string, string>) => void;
  photoUrls: string[]; setPhotoUrls: (v: string[]) => void;
  notes: string; setNotes: (v: string) => void;
  onReset: () => void;
};

function ItemsForm({ adOnly, branch, selYear, selMonth, selCategory, selProduct, items, setItems, photoUrls, setPhotoUrls, notes, setNotes, onReset }: ItemsFormProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateChecklist();
  const { data: allGuides = [], isLoading: guideLoading } = useGuidesByProduct(selProduct);
  const { data: allAdGuides = [] } = useAdGuidesByProduct(selProduct);
  const { notifications: guideNotifs, dismiss: dismissGuide } = useGuideNotifications();
  const relevantGuideNotif = guideNotifs.find(n =>
    (!n.product || n.product === selProduct) &&
    (!n.category || n.category === selCategory)
  );
  const [selectedStoreType, setSelectedStoreType] = useState<string | null>(null);
  const storeTypeOptions = Array.from(new Set(allGuides.filter(g => g.storeType).map(g => g.storeType as string)));
  const hasStoreTypes = storeTypeOptions.length > 0;
  const dbGuide = hasStoreTypes
    ? (allGuides.find(g => g.storeType === (selectedStoreType || storeTypeOptions[0])) ?? allGuides[0])
    : allGuides[0] ?? null;
  const activeStoreType = hasStoreTypes ? (selectedStoreType || storeTypeOptions[0]) : null;
  const adGuide = allAdGuides[0] ?? null;
  const adGuideItems: string[] = (adGuide?.items as string[])?.filter(Boolean) || [];
  const adGuidePoints: string[] = (adGuide?.points as string[]) || [];
  const [adItems, setAdItems] = useState<Record<string, string>>({});
  const [adPhotoUrls, setAdPhotoUrls] = useState<string[]>([]);
  const [adLocalPreviews, setAdLocalPreviews] = useState<string[]>([]);
  const [adUploadingCount, setAdUploadingCount] = useState(0);
  const [adNotes, setAdNotes] = useState('');
  const hasVmGuide = allGuides.length > 0;
  const adFileInputRef = useRef<HTMLInputElement>(null);
  const adPhotoUrlsRef = useRef<string[]>([]);
  adPhotoUrlsRef.current = adPhotoUrls;
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoUrlsRef = useRef<string[]>([]);
  photoUrlsRef.current = photoUrls;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';
    const previews = files.map(f => URL.createObjectURL(f));
    setLocalPreviews(prev => [...prev, ...previews]);
    setUploadingCount(c => c + files.length);
    try {
      const { uploadFile } = await import("@/lib/upload");
      const results = await Promise.allSettled(files.map(f => uploadFile(f)));
      const uploaded: string[] = [];
      const failedIndexes: number[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') uploaded.push(r.value);
        else failedIndexes.push(i);
      });
      if (uploaded.length > 0) setPhotoUrls([...photoUrlsRef.current, ...uploaded]);
      if (failedIndexes.length > 0) {
        const failedSet = new Set(failedIndexes.map(i => previews[i]));
        setLocalPreviews(prev => prev.filter(p => !failedSet.has(p)));
        toast({ title: `${failedIndexes.length}장 업로드 실패`, variant: "destructive" });
      }
    } finally {
      setUploadingCount(0);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== index));
    setLocalPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAdFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';
    const previews = files.map(f => URL.createObjectURL(f));
    setAdLocalPreviews(prev => [...prev, ...previews]);
    setAdUploadingCount(c => c + files.length);
    try {
      const { uploadFile } = await import("@/lib/upload");
      const results = await Promise.allSettled(files.map(f => uploadFile(f)));
      const uploaded: string[] = [];
      results.forEach((r) => { if (r.status === 'fulfilled') uploaded.push(r.value); });
      if (uploaded.length > 0) setAdPhotoUrls([...adPhotoUrlsRef.current, ...uploaded]);
    } finally {
      setAdUploadingCount(0);
    }
  };

  const removeAdPhoto = (index: number) => {
    setAdPhotoUrls(adPhotoUrls.filter((_, i) => i !== index));
    setAdLocalPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const submitForm = async () => {
    const isAd = effectiveInspectionType === 'ad';
    const hasNotok = isAd
      ? Object.values(adItems).includes('notok')
      : Object.values(items).includes('notok');
    const finalStatus = hasNotok ? 'poor' : 'excellent';
    try {
      const created = await createMutation.mutateAsync({
        branch,
        category: selCategory,
        product: selProduct,
        status: finalStatus,
        checklistType: isAd ? 'ad' : 'vm',
        photoUrl: isAd ? (adPhotoUrls[0] || null) : (photoUrls[0] || null),
        photoUrls: isAd ? (adPhotoUrls.length > 0 ? adPhotoUrls : null) : (photoUrls.length > 0 ? photoUrls : null),
        notes: isAd ? null : (notes || null),
        items: isAd ? {} : items,
        year: selYear,
        month: selMonth,
        ...(isAd && {
          adItems: Object.keys(adItems).length > 0 ? adItems : null,
          adPhotoUrls: adPhotoUrls.length > 0 ? adPhotoUrls : null,
          adNotes: adNotes.trim() || null,
        }),
      } as any);
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
  const effectiveInspectionType = adOnly ? 'ad' : (adGuide && !hasVmGuide ? 'ad' : 'vm');
  const allItemsChecked = effectiveInspectionType === 'ad'
    ? true
    : (guideItems.length === 0 || guideItems.every(item => items[item]));

  const displayProduct = selProduct?.replace(/\[(.+?)\](.*)/, (_: string, g: string, rest: string) => rest ? `${g} > ${rest}` : g) || selProduct;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pb-10">
      <div className="border-b-2 border-border pb-4">
        <p className="text-xs text-muted-foreground font-medium">{branch}점 · {selCategory} · {selYear}년 {selMonth}월 · {adOnly ? '📢 광고 점검' : 'VM 점검'}</p>
        <h2 className="text-xl font-black text-secondary mt-0.5">{displayProduct}</h2>
      </div>


      {/* Guide */}
      {effectiveInspectionType === 'vm' && (guideLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : dbGuide ? (
        <div className="space-y-4">
          {relevantGuideNotif && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3" data-testid="banner-guide-update">
              <span className="text-lg">📢</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-blue-700">가이드가 업데이트 됐습니다</p>
                <p className="text-xs text-blue-600">새로운 점검을 등록해주세요</p>
              </div>
              <button
                onClick={() => dismissGuide(relevantGuideNotif)}
                className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 active:scale-95 transition-all"
                data-testid="btn-guide-banner-dismiss"
              >
                <XCircle className="w-4 h-4 text-blue-400" />
              </button>
            </div>
          )}
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
      ))}

      {/* Photo Upload */}
      {effectiveInspectionType === 'vm' && <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-secondary">현장 사진 촬영</h3>
          {localPreviews.length > 0 && (
            <span className="text-sm font-bold text-muted-foreground">{localPreviews.length}장</span>
          )}
        </div>

        {/* Uploaded photo grid */}
        {localPreviews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {localPreviews.map((preview, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-border bg-muted">
                <img src={preview} alt={`사진 ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-90 transition-all"
                  data-testid={`btn-remove-photo-${i}`}
                >
                  <XCircle className="w-4 h-4" />
                </button>
                {i >= photoUrls.length && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add photo button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl border-4 border-dashed border-primary/30 bg-primary/5 active:scale-[0.98] transition-all"
          data-testid="btn-add-photo"
        >
          {uploadingCount > 0
            ? <><Loader2 className="w-7 h-7 text-primary animate-spin" /><span className="font-bold text-primary text-lg">업로드 중...</span></>
            : <><Camera className="w-7 h-7 text-primary" /><span className="font-bold text-primary text-lg">{localPreviews.length > 0 ? '사진 추가하기' : '탭하여 사진 업로드'}</span></>
          }
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />
      </div>}

      {/* Per-item ○/✗ evaluation */}
      {effectiveInspectionType === 'vm' && guideItems.length > 0 && (
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
      {effectiveInspectionType === 'vm' && <div className="space-y-3">
        <h3 className="text-xl font-bold text-secondary">특이사항 (선택)</h3>
        <textarea
          placeholder="VM 집기 부족/파손/광고물 요청 등..."
          className="w-full p-5 rounded-2xl border-2 border-border bg-white text-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all min-h-[8rem] resize-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>}
      {/* Ad Inspection Section */}
      {effectiveInspectionType === 'ad' && !adGuide && (
        <div className="bg-muted/30 rounded-3xl border border-border p-6 text-center text-muted-foreground">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>이 상품의 광고 가이드가 아직 등록되지 않았습니다.</p>
        </div>
      )}
      {effectiveInspectionType === 'ad' && adGuide && (
        <div className="space-y-5 pt-2">

          {adGuide.imageUrl && (
            <div className="bg-amber-900 text-white rounded-3xl p-4 shadow-xl space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="text-amber-300 w-6 h-6" />
                <h3 className="text-xl font-bold">광고 가이드</h3>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="w-full rounded-2xl overflow-hidden aspect-video bg-muted/20 border border-white/10 relative group active:scale-[0.98] transition-all">
                    <img src={adGuide.imageUrl} alt="Ad Guide" className="w-full h-full object-contain bg-white" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-white/90 text-secondary px-4 py-2 rounded-full font-bold text-sm">클릭하여 확대</span>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] w-full p-0 border-none bg-transparent shadow-none">
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <TransformWrapper initialScale={1} minScale={1} maxScale={4} centerOnInit>
                      <TransformComponent wrapperStyle={{ width: "100%", height: "90vh" }}>
                        <img src={adGuide.imageUrl} alt="Ad Guide Full" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white mx-auto" />
                      </TransformComponent>
                    </TransformWrapper>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {adGuidePoints.length > 0 && (
            <div className="bg-amber-50 rounded-3xl border border-amber-200 p-5 space-y-3">
              <h4 className="text-lg font-bold text-amber-800 flex items-center gap-2">
                <div className="w-2 h-6 bg-amber-500 rounded-full" />광고 핵심 포인트
              </h4>
              <div className="space-y-2">
                {adGuidePoints.map((point, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-amber-200/50 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">{i+1}</div>
                    <p className="text-base font-medium text-secondary leading-tight">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ad photo upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-secondary">광고 현장 사진</h3>
              {adLocalPreviews.length > 0 && <span className="text-sm font-bold text-muted-foreground">{adLocalPreviews.length}장</span>}
            </div>
            {adLocalPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {adLocalPreviews.map((preview, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-amber-200 bg-muted">
                    <img src={preview} alt={`광고 사진 ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeAdPhoto(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-90 transition-all"
                      data-testid={`btn-remove-ad-photo-${i}`}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    {i >= adPhotoUrls.length && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => adFileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl border-4 border-dashed border-amber-300 bg-amber-50 active:scale-[0.98] transition-all"
              data-testid="btn-add-ad-photo"
            >
              {adUploadingCount > 0
                ? <><Loader2 className="w-7 h-7 text-amber-500 animate-spin" /><span className="font-bold text-amber-600 text-lg">업로드 중...</span></>
                : <><Camera className="w-7 h-7 text-amber-500" /><span className="font-bold text-amber-600 text-lg">{adLocalPreviews.length > 0 ? '광고 사진 추가' : '광고 사진 업로드'}</span></>
              }
            </button>
            <input ref={adFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAdFile} />
          </div>

          {/* Ad items evaluation */}
          {adGuideItems.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-secondary">광고 항목 점검</h3>
                <p className="text-sm text-muted-foreground">광고 가이드와 일치하면 ○, 다르면 ✗를 선택하세요.</p>
              </div>
              {adGuideItems.map((item) => (
                <div key={item} className={`rounded-2xl border-2 overflow-hidden transition-all ${
                  adItems[item] === 'ok' ? 'border-amber-300 bg-amber-50'
                  : adItems[item] === 'notok' ? 'border-primary bg-red-50'
                  : 'border-border bg-white'
                }`}>
                  <div className="flex items-center justify-between p-4">
                    <h4 className="text-base font-bold text-secondary flex-1 pr-3">{item}</h4>
                    <div className="flex gap-3 shrink-0">
                      <button
                        onClick={() => setAdItems({ ...adItems, [item]: 'ok' })}
                        className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${
                          adItems[item] === 'ok' ? 'bg-amber-500 border-amber-600 text-white shadow-md' : 'bg-white border-border text-muted-foreground'
                        }`}
                        data-testid={`btn-ad-item-ok-${item}`}
                      >
                        <CheckCircle2 className="w-8 h-8" />
                      </button>
                      <button
                        onClick={() => setAdItems({ ...adItems, [item]: 'notok' })}
                        className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${
                          adItems[item] === 'notok' ? 'bg-primary border-red-700 text-white shadow-md' : 'bg-white border-border text-muted-foreground'
                        }`}
                        data-testid={`btn-ad-item-notok-${item}`}
                      >
                        <XCircle className="w-8 h-8" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-sm font-medium text-muted-foreground">
                <span>{Object.keys(adItems).length} / {adGuideItems.length} 완료</span>
                {Object.values(adItems).includes('notok') && (
                  <span className="text-primary font-bold">불일치 {Object.values(adItems).filter(v => v === 'notok').length}건</span>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-base font-bold text-amber-700">광고 특이사항 (선택)</label>
            <textarea
              value={adNotes}
              onChange={e => setAdNotes(e.target.value)}
              placeholder="광고 관련 특이사항을 입력하세요..."
              rows={3}
              className="w-full rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-base text-secondary placeholder:text-amber-300 focus:outline-none focus:border-amber-400 resize-none"
              data-testid="textarea-ad-notes"
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={submitForm}
        disabled={createMutation.isPending || uploadingCount > 0 || !allItemsChecked}
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
