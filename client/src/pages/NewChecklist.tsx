import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useCreateChecklist, useUploadPhoto, useChecklists } from "@/hooks/use-checklists";
import { useGuidesByProduct, useAdGuidesByProduct, useQualityGuidesByProduct, useValidGuideProducts } from "@/hooks/use-guides";
import { useProducts, useProductByName } from "@/hooks/use-products";
import { useGuideNotifications } from "@/hooks/use-notifications";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Package, Camera, CheckCircle2, XCircle,
  Image as ImageIcon, Loader2, ChevronRight, ChevronLeft, Droplets,
  Calendar, FileText, Paperclip,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { PhotoThumbnail } from "@/components/PhotoLightbox";

const REGIONS: Record<string, string[]> = {
  '대형점': ['강남', '강서', '야탑', '불광', '송파', '부천', '평촌', '분당', '신구로'],
  '중형점': ['구의', '유성', '일산', '수성', '광명', '쇼핑', '해운대', '산본', '동수원', '괴정'],
  '소형점': ['부산대', '인천', '고잔', '중계', '김포', '청주'],
};
const CATEGORIES = ['농산', '수산', '축산', '공산'];
const QUALITY_CATEGORIES = ['농산', '수산', '축산'];

const QUALITY_GRADE_SCORES: Record<string, number> = { A: 100, B: 85, C: 70, E: 40 };
const QUALITY_CRITERIA = ['선도', '상해', '규격', '혼입율'] as const;
type QualityCriteria = typeof QUALITY_CRITERIA[number];

type QualityGradeData = {
  선도?: string; 상해?: string; 규격?: string; 혼입율?: string;
  expired?: number; moldy?: number;
};

function calcQualityItemScore(data: QualityGradeData): number {
  const 선도 = QUALITY_GRADE_SCORES[data.선도 || ''] ?? 0;
  const 상해 = QUALITY_GRADE_SCORES[data.상해 || ''] ?? 0;
  const penalty = (data.expired || 0) * 2 + (data.moldy || 0) * 5;
  return Math.max(0, Math.round((선도 + 상해) / 2) - penalty);
}

function calcOverallQualityScore(items: Record<string, QualityGradeData>): number {
  const vals = Object.values(items);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((s, d) => s + calcQualityItemScore(d), 0) / vals.length);
}

function getQualityGrade(score: number): string {
  if (score >= 100) return 'A';
  if (score >= 85)  return 'B';
  if (score >= 70)  return 'C';
  if (score > 55)   return 'D';
  if (score >= 40)  return 'E';
  return '0';
}

function gradeColor(grade: string): string {
  if (grade === 'A') return 'bg-purple-600 text-white';
  if (grade === 'B') return 'bg-purple-400 text-white';
  if (grade === 'C') return 'bg-amber-400 text-white';
  if (grade === 'D') return 'bg-orange-500 text-white';
  if (grade === 'E') return 'bg-red-500 text-white';
  return 'bg-gray-400 text-white';
}

type VMStage = 'category' | 'group' | 'product' | 'items';

export default function NewChecklist() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [branch, setBranch] = useState('');
  const [activeTab, setActiveTab] = useState<'vm' | 'quality' | 'cleaning'>('vm');

  const nowDate = new Date();
  const [selYear, setSelYear] = useState(nowDate.getFullYear());
  const [selMonth, setSelMonth] = useState(nowDate.getMonth() + 1);

  const prevMonth = () => {
    if (selMonth === 1) { setSelYear(y => y - 1); setSelMonth(12); }
    else { setSelMonth(m => m - 1); }
    resetVm();
  };
  const nextMonth = () => {
    if (selMonth === 12) { setSelYear(y => y + 1); setSelMonth(1); }
    else { setSelMonth(m => m + 1); }
    resetVm();
  };

  const [vmStage, setVmStage] = useState<VMStage>('category');
  const [selCategory, setSelCategory] = useState('');
  const [selGroup, setSelGroup] = useState('');
  const [selProduct, setSelProduct] = useState('');
  const [items, setItems] = useState<Record<string, string>>({});
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState('');


  const { data: branchChecklists = [] } = useChecklists({ branch: branch || undefined });
  const { data: validGuideProducts = [] } = useValidGuideProducts(selYear, selMonth);

  // VM tab: products with a valid VM or Ad guide (not quality), not yet submitted
  const pendingGuideNotifs = validGuideProducts
    .filter(g => g.guideType !== 'quality')
    .filter(g => !branchChecklists.some(c => {
      const ct = (c as any).checklistType || 'vm';
      return c.product === g.product && (c as any).year === selYear && (c as any).month === selMonth && ct === 'vm';
    }));

  // Quality tab: products with a valid Quality guide for selYear/selMonth, not yet submitted
  const pendingQualityGuideNotifs = validGuideProducts
    .filter(g => g.guideType === 'quality')
    .filter(g => !branchChecklists.some(c => {
      const ct = (c as any).checklistType || 'vm';
      return c.product === g.product && (c as any).year === selYear && (c as any).month === selMonth && ct === 'quality';
    }));

  const resetVm = () => {
    setVmStage('category');
    setSelCategory('');
    setSelGroup('');
    setSelProduct('');
    setItems({});
    setPhotoUrls([]);
    setNotes('');
  };

  const handleTabChange = (tab: 'vm' | 'quality' | 'cleaning') => {
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
              <optgroup label="대형점">
                {REGIONS['대형점'].map(b => <option key={b} value={b}>{b}점</option>)}
              </optgroup>
              <optgroup label="중형점">
                {REGIONS['중형점'].map(b => <option key={b} value={b}>{b}점</option>)}
              </optgroup>
              <optgroup label="소형점">
                {REGIONS['소형점'].map(b => <option key={b} value={b}>{b}점</option>)}
              </optgroup>
            </select>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-muted p-1 rounded-2xl">
            <button
              onClick={() => handleTabChange('vm')}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'vm' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'
              }`}
              data-testid="tab-new-vm"
            >
              진열(+광고)
              {pendingGuideNotifs.length > 0 && (
                <span className="absolute -top-1.5 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center leading-none">
                  {pendingGuideNotifs.length}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('quality')}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'quality' ? 'bg-white text-purple-600 shadow-sm' : 'text-muted-foreground'
              }`}
              data-testid="tab-new-quality"
            >
              품질
              {pendingQualityGuideNotifs.length > 0 && (
                <span className="absolute -top-1.5 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center leading-none">
                  {pendingQualityGuideNotifs.length}
                </span>
              )}
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

          {/* Year/Month filter — VM / Quality tabs */}
          {(activeTab === 'vm' || activeTab === 'quality') && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-bold text-sm text-secondary whitespace-nowrap">{selYear}년</span>
              </div>
              <div className="flex items-center gap-3 bg-muted rounded-xl px-4 py-2.5 flex-1 justify-between">
                <button onClick={prevMonth} className="active:scale-95 transition-all" data-testid="btn-new-prev-month">
                  <ChevronLeft className="w-4 h-4 text-secondary" />
                </button>
                <span className="font-bold text-sm text-secondary">{selMonth}월</span>
                <button onClick={nextMonth} className="active:scale-95 transition-all" data-testid="btn-new-next-month">
                  <ChevronRight className="w-4 h-4 text-secondary" />
                </button>
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
            ) : activeTab === 'quality' ? (
              /* Quality tab */
              <VMContent
                key="quality"
                adOnly={false}
                qualityOnly={true}
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
                pendingGuideNotifs={pendingQualityGuideNotifs}
                allGuideProducts={validGuideProducts.filter(g => g.guideType === 'quality')}
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
                allGuideProducts={validGuideProducts.filter(g => g.guideType !== 'quality')}
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
  qualityOnly?: boolean;
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
  pendingGuideNotifs: { product: string; category: string }[];
  allGuideProducts?: { product: string; category: string }[];
};

function VMContent({ adOnly, qualityOnly = false, branch, selYear, selMonth, vmStage, setVmStage, selCategory, setSelCategory, selGroup, setSelGroup, selProduct, setSelProduct, items, setItems, photoUrls, setPhotoUrls, notes, setNotes, onReset, pendingGuideNotifs, allGuideProducts = [] }: VMContentProps) {
  const { data: dbProducts = [], isLoading } = useProducts(selCategory);
  const groups = Array.from(new Set(dbProducts.map(p => p.groupName)));

  const catBadge = (cat: string) => pendingGuideNotifs.filter(n => n.category === cat).length;
  const groupBadge = (grp: string) => pendingGuideNotifs.filter(n => n.product && (n.product === `[${grp}]` || n.product.startsWith(`[${grp}]`))).length;
  const productBadge = (product: string) => pendingGuideNotifs.filter(n => n.product === product).length > 0;

  return (
    <div className="p-4 md:p-8 space-y-4 max-w-3xl mx-auto w-full">
      {/* Stage back-nav */}
      {vmStage !== 'category' && (
        <button
          onClick={() => {
            if (vmStage === 'group') { setVmStage('category'); setSelCategory(''); setSelGroup(''); }
            else if (vmStage === 'product') { setVmStage('group'); setSelGroup(''); }
            else if (vmStage === 'items') {
              if (qualityOnly && selCategory !== '농산') {
                setVmStage('category'); setSelCategory(''); setSelProduct('');
              } else if (qualityOnly && selCategory === '농산') {
                setVmStage('group'); setSelGroup(''); setSelProduct('');
              } else {
                setVmStage('product'); setSelProduct('');
              }
            }
          }}
          className="flex items-center gap-2 text-sm font-bold text-muted-foreground active:scale-95 transition-all py-1"
          data-testid="btn-vm-back"
        >
          <ChevronLeft className="w-4 h-4" />
          {vmStage === 'group' ? '카테고리 선택으로' : vmStage === 'product' ? '그룹 선택으로' : (qualityOnly && selCategory !== '농산') ? '카테고리 선택으로' : qualityOnly ? '구분 선택으로' : '상품 선택으로'} 돌아가기
        </button>
      )}

      <AnimatePresence mode="wait">
        {/* ── Category ── */}
        {vmStage === 'category' && (
          <motion.div key="cat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <div className="mb-5">
              <p className="text-xs font-bold text-primary mb-1">{selYear}년 {selMonth}월 · {branch}점 · {qualityOnly ? '품질 점검' : '진열(+광고) 점검'}</p>
              <h2 className="text-2xl font-black text-secondary">카테고리 선택</h2>
            </div>
            {(qualityOnly ? QUALITY_CATEGORIES : CATEGORIES).map(cat => {
              const badge = catBadge(cat);
              return (
                <button key={cat}
                  onClick={() => {
                    setSelCategory(cat);
                    setSelGroup('');
                    if (qualityOnly && cat !== '농산') {
                      setSelProduct(cat);
                      setVmStage('items');
                    } else {
                      setVmStage('group');
                    }
                  }}
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
              <p className="text-xs font-bold text-primary mb-1">{selYear}년 {selMonth}월 · {branch}점 · {selCategory} · {qualityOnly ? '품질 점검' : '진열(+광고) 점검'}</p>
              <h2 className="text-2xl font-black text-secondary">{qualityOnly ? '구분 선택' : '상품 그룹 선택'}</h2>
            </div>

            {/* Quality 농산 → 채소/청과 subcategory */}
            {qualityOnly && selCategory === '농산' && (
              <div className="space-y-3">
                {['채소', '청과'].map(sub => (
                  <button
                    key={sub}
                    onClick={() => { setSelGroup(sub); setSelProduct(sub); setVmStage('items'); }}
                    className="w-full flex items-center justify-between p-6 rounded-3xl border-2 border-border bg-white text-secondary hover:border-purple-400/50 shadow-sm active:scale-[0.98] transition-all"
                    data-testid={`btn-quality-sub-${sub}`}
                  >
                    <span className="text-3xl font-bold">{sub}</span>
                    <ChevronRight className="w-6 h-6 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {/* VM 상품 그룹 선택 */}
            {!qualityOnly && isLoading && (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
            )}
            {!qualityOnly && !isLoading && groups.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">등록된 상품 그룹이 없습니다</p>
              </div>
            )}
            {!qualityOnly && !isLoading && groups.length > 0 && (
              <div className="space-y-3">
                {[...groups].sort((a, b) => {
                  const badgeA = groupBadge(a) > 0 ? 0 : 1;
                  const badgeB = groupBadge(b) > 0 ? 0 : 1;
                  if (badgeA !== badgeB) return badgeA - badgeB;
                  const hasGuideA = allGuideProducts.some(g => g.product === `[${a}]` || g.product.startsWith(`[${a}]`)) ? 0 : 1;
                  const hasGuideB = allGuideProducts.some(g => g.product === `[${b}]` || g.product.startsWith(`[${b}]`)) ? 0 : 1;
                  return hasGuideA - hasGuideB;
                }).map(group => {
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
                })}
              </div>
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
            {dbProducts.filter(p => p.groupName === selGroup && p.productName).sort((a, b) => {
              const keyA = `[${selGroup}]${a.productName}`;
              const keyB = `[${selGroup}]${b.productName}`;
              const badgeA = productBadge(keyA) ? 0 : 1;
              const badgeB = productBadge(keyB) ? 0 : 1;
              if (badgeA !== badgeB) return badgeA - badgeB;
              const guideA = allGuideProducts.some(g => g.product === keyA) ? 0 : 1;
              const guideB = allGuideProducts.some(g => g.product === keyB) ? 0 : 1;
              return guideA - guideB;
            }).map(p => {
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
            qualityOnly={qualityOnly}
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
  qualityOnly?: boolean;
  branch: string; selYear: number; selMonth: number;
  selCategory: string; selProduct: string;
  items: Record<string, string>; setItems: (v: Record<string, string>) => void;
  photoUrls: string[]; setPhotoUrls: (v: string[]) => void;
  notes: string; setNotes: (v: string) => void;
  onReset: () => void;
};

function ItemsForm({ adOnly, qualityOnly = false, branch, selYear, selMonth, selCategory, selProduct, items, setItems, photoUrls, setPhotoUrls, notes, setNotes, onReset }: ItemsFormProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateChecklist();
  const { data: allGuides = [], isLoading: guideLoading } = useGuidesByProduct(selProduct, selYear, selMonth);
  const { data: allAdGuides = [] } = useAdGuidesByProduct(selProduct, selYear, selMonth);
  const { data: allQualityGuides = [] } = useQualityGuidesByProduct(selProduct, selYear, selMonth);
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
  // Quality guide states
  const qualityGuide = allQualityGuides[0] ?? null;
  const qualityGuideItems: string[] = (qualityGuide?.items as string[])?.filter(Boolean) || [];
  const qualityGuidePoints: string[] = (qualityGuide?.points as string[]) || [];
  const [qualityItems, setQualityItems] = useState<Record<string, QualityGradeData>>({});
  const [qualityPhotoUrls, setQualityPhotoUrls] = useState<string[]>([]);
  const [qualityLocalPreviews, setQualityLocalPreviews] = useState<string[]>([]);
  const [qualityUploadingCount, setQualityUploadingCount] = useState(0);
  const [qualityNotes, setQualityNotes] = useState('');
  const qualityFileInputRef = useRef<HTMLInputElement>(null);
  const qualityPhotoUrlsRef = useRef<string[]>([]);
  qualityPhotoUrlsRef.current = qualityPhotoUrls;
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

  const handleQualityFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';
    const previews = files.map(f => URL.createObjectURL(f));
    setQualityLocalPreviews(prev => [...prev, ...previews]);
    setQualityUploadingCount(c => c + files.length);
    try {
      const { uploadFile } = await import("@/lib/upload");
      const results = await Promise.allSettled(files.map(f => uploadFile(f)));
      const uploaded: string[] = [];
      results.forEach((r) => { if (r.status === 'fulfilled') uploaded.push(r.value); });
      if (uploaded.length > 0) setQualityPhotoUrls([...qualityPhotoUrlsRef.current, ...uploaded]);
    } finally {
      setQualityUploadingCount(0);
    }
  };

  const removeQualityPhoto = (index: number) => {
    setQualityPhotoUrls(qualityPhotoUrls.filter((_, i) => i !== index));
    setQualityLocalPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const submitForm = async () => {
    const isQuality = effectiveInspectionType === 'quality';
    const overallQualityScore = isQuality ? calcOverallQualityScore(qualityItems) : 0;
    const hasNotok = isQuality
      ? overallQualityScore < 90
      : Object.values(items).includes('notok') || Object.values(adItems).includes('notok');
    const finalStatus = hasNotok ? 'poor' : 'excellent';
    try {
      const created = await createMutation.mutateAsync({
        branch,
        category: selCategory,
        product: selProduct,
        status: finalStatus,
        checklistType: isQuality ? 'quality' : 'vm',
        photoUrl: isQuality ? (qualityPhotoUrls[0] || null) : (photoUrls[0] || null),
        photoUrls: isQuality ? (qualityPhotoUrls.length > 0 ? qualityPhotoUrls : null) : (photoUrls.length > 0 ? photoUrls : null),
        notes: isQuality ? null : (notes || null),
        items: isQuality ? {} : items,
        year: selYear,
        month: selMonth,
        ...(!isQuality && adGuide && {
          adItems: Object.keys(adItems).length > 0 ? adItems : null,
          adPhotoUrls: adPhotoUrls.length > 0 ? adPhotoUrls : null,
          adNotes: adNotes.trim() || null,
        }),
        ...(isQuality && {
          qualityItems: Object.keys(qualityItems).length > 0 ? qualityItems : null,
          qualityPhotoUrls: qualityPhotoUrls.length > 0 ? qualityPhotoUrls : null,
          qualityNotes: qualityNotes.trim() || null,
        }),
      } as any);
      toast({ title: "제출 완료!" });
      onReset();
      setLocation(`/checklist/edit/${created.id}`);
    } catch (err) {
      toast({ title: "제출 실패", description: String(err), variant: "destructive" });
    }
  };

  const guideImages: string[] = (() => {
    const urls = (dbGuide as any)?.imageUrls as string[] | null;
    if (urls && urls.length > 0) return urls;
    return dbGuide?.imageUrl ? [dbGuide.imageUrl] : [];
  })();
  const adGuideImages: string[] = (() => {
    const urls = (adGuide as any)?.imageUrls as string[] | null;
    if (urls && urls.length > 0) return urls;
    return adGuide?.imageUrl ? [adGuide.imageUrl] : [];
  })();
  const [vmImgIdx, setVmImgIdx] = useState(0);
  const [adImgIdx, setAdImgIdx] = useState(0);
  const [qualityImgIdx, setQualityImgIdx] = useState(0);
  const guidePoints: string[] = (dbGuide?.points as string[]) || [];
  const guideItems: string[] = (dbGuide?.items as string[])?.filter(Boolean) || [];
  const qualityGuideImages: string[] = (() => {
    const urls = (qualityGuide as any)?.imageUrls as string[] | null;
    if (urls && urls.length > 0) return urls;
    return qualityGuide?.imageUrl ? [qualityGuide.imageUrl] : [];
  })();
  const qualityGuideAttachFiles: string[] = (qualityGuide as any)?.attachFileUrls ?? [];
  const effectiveInspectionType = qualityOnly ? 'quality' : 'vm';
  const allItemsChecked = effectiveInspectionType === 'quality'
    ? (qualityGuideItems.length === 0 || qualityGuideItems.every(item => {
        const d = qualityItems[item];
        return d && d.선도 && d.상해 && d.규격 && d.혼입율;
      }))
    : (guideItems.length === 0 || guideItems.every(item => items[item]));

  const displayProduct = selProduct?.replace(/\[(.+?)\](.*)/, (_: string, g: string, rest: string) => rest ? `${g} > ${rest}` : g) || selProduct;

  // Parse product for file lookup
  const productMatch = selProduct?.match(/^\[(.+?)\](.*)$/);
  const productGroupName = productMatch?.[1] ?? '';
  const productDetailName = productMatch?.[2]?.trim() || null;
  const { data: productRecord } = useProductByName(selCategory, productGroupName, productDetailName, !!productGroupName && effectiveInspectionType === 'vm');
  const productFiles: string[] = (productRecord as any)?.fileUrls ?? [];

  const parseFileEntry = (entry: string) => {
    const idx = entry.indexOf('||');
    if (idx === -1) return { name: '파일', url: entry };
    return { name: entry.slice(0, idx), url: entry.slice(idx + 2) };
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pb-10">
      <div className="border-b-2 border-border pb-4">
        <p className="text-xs text-muted-foreground font-medium">{branch}점 · {selCategory} · {selYear}년 {selMonth}월 · {effectiveInspectionType === 'quality' ? '품질 점검' : '진열(+광고) 점검'}</p>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <h2 className="text-xl font-black text-secondary">{displayProduct}</h2>
          {effectiveInspectionType === 'vm' && adGuide && (
            <div className="flex items-center gap-2 shrink-0">
              {(adGuide as any)?.videoUrl && (
                <a
                  href={(adGuide as any).videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all text-white text-xs font-bold px-3 py-1.5 rounded-full"
                  data-testid="link-ad-video"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
                  </svg>
                  영상
                </a>
              )}
              {(adGuide as any)?.videoLinkUrl && (
                <a
                  href={(adGuide as any).videoLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all text-white text-xs font-bold px-3 py-1.5 rounded-full"
                  data-testid="link-ad-video-link"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  링크
                </a>
              )}
            </div>
          )}
        </div>
        {/* VM product file downloads */}
        {effectiveInspectionType === 'vm' && productFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {productFiles.map((entry, i) => {
              const { name, url } = parseFileEntry(entry);
              return (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={name}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
                  data-testid={`link-product-file-${i}`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>진열 상품</span>
                </a>
              );
            })}
          </div>
        )}
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
            {guideImages.length > 0 ? (
              <div className="space-y-2">
                <div className="relative">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="w-full rounded-2xl overflow-hidden aspect-video bg-muted/20 border border-white/10 relative group active:scale-[0.98] transition-all">
                        <img src={guideImages[vmImgIdx]} alt="Guide" className="w-full h-full object-contain bg-white" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-white/90 text-secondary px-4 py-2 rounded-full font-bold text-sm">클릭하여 확대</span>
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] w-full p-0 border-none bg-transparent shadow-none">
                      <div className="w-full h-full flex items-center justify-center p-4">
                        <TransformWrapper initialScale={1} minScale={1} maxScale={4} centerOnInit>
                          <TransformComponent wrapperStyle={{ width: "100%", height: "90vh" }}>
                            <img src={guideImages[vmImgIdx]} alt="Guide Full" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white mx-auto" />
                          </TransformComponent>
                        </TransformWrapper>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {guideImages.length > 1 && (
                    <>
                      <button onClick={() => setVmImgIdx(i => (i - 1 + guideImages.length) % guideImages.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-90 transition-all z-10">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button onClick={() => setVmImgIdx(i => (i + 1) % guideImages.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-90 transition-all z-10">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
                {guideImages.length > 1 && (
                  <div className="flex justify-center items-center gap-1.5">
                    {guideImages.map((_, i) => (
                      <button key={i} onClick={() => setVmImgIdx(i)}
                        className={`rounded-full transition-all ${i === vmImgIdx ? 'w-4 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`} />
                    ))}
                    <span className="text-xs text-white/60 ml-1">{vmImgIdx + 1}/{guideImages.length}</span>
                  </div>
                )}
              </div>
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
                <PhotoThumbnail src={i < photoUrls.length ? photoUrls[i] : null} className="w-full h-full block">
                  <img src={preview} alt={`사진 ${i + 1}`} className="w-full h-full object-cover" />
                </PhotoThumbnail>
                <button
                  onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-90 transition-all z-10"
                  data-testid={`btn-remove-photo-${i}`}
                >
                  <XCircle className="w-4 h-4" />
                </button>
                {i >= photoUrls.length && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
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
      {/* Ad Inspection Section — shown inline within VM tab */}
      {effectiveInspectionType === 'vm' && adGuide && (
        <div className="space-y-5 pt-2">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-amber-200" />
            <span className="text-sm font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">광고(+셀링) 점검</span>
            <div className="h-px flex-1 bg-amber-200" />
          </div>

          {adGuideImages.length > 0 && (
            <div className="bg-secondary text-white rounded-3xl p-4 shadow-xl space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="text-primary w-6 h-6" />
                <h3 className="text-xl font-bold">광고 가이드</h3>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="w-full rounded-2xl overflow-hidden aspect-video bg-muted/20 border border-white/10 relative group active:scale-[0.98] transition-all">
                        <img src={adGuideImages[adImgIdx]} alt="Ad Guide" className="w-full h-full object-contain bg-white" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-white/90 text-secondary px-4 py-2 rounded-full font-bold text-sm">클릭하여 확대</span>
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] w-full p-0 border-none bg-transparent shadow-none">
                      <div className="w-full h-full flex items-center justify-center p-4">
                        <TransformWrapper initialScale={1} minScale={1} maxScale={4} centerOnInit>
                          <TransformComponent wrapperStyle={{ width: "100%", height: "90vh" }}>
                            <img src={adGuideImages[adImgIdx]} alt="Ad Guide Full" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white mx-auto" />
                          </TransformComponent>
                        </TransformWrapper>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {adGuideImages.length > 1 && (
                    <>
                      <button onClick={() => setAdImgIdx(i => (i - 1 + adGuideImages.length) % adGuideImages.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-90 transition-all z-10">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button onClick={() => setAdImgIdx(i => (i + 1) % adGuideImages.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-90 transition-all z-10">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
                {adGuideImages.length > 1 && (
                  <div className="flex justify-center items-center gap-1.5">
                    {adGuideImages.map((_, i) => (
                      <button key={i} onClick={() => setAdImgIdx(i)}
                        className={`rounded-full transition-all ${i === adImgIdx ? 'w-4 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`} />
                    ))}
                    <span className="text-xs text-white/60 ml-1">{adImgIdx + 1}/{adGuideImages.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}


          {adGuidePoints.length > 0 && (
            <div className="bg-muted/50 rounded-3xl border border-border p-5 space-y-3">
              <h4 className="text-lg font-bold text-secondary flex items-center gap-2">
                <div className="w-2 h-6 bg-primary rounded-full" />광고 핵심 포인트
              </h4>
              <div className="space-y-2">
                {adGuidePoints.map((point, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-border/50 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">{i+1}</div>
                    <p className="text-base font-medium text-secondary leading-tight">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ad photo upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-secondary">현장 사진 촬영</h3>
              {adLocalPreviews.length > 0 && <span className="text-sm font-bold text-muted-foreground">{adLocalPreviews.length}장</span>}
            </div>
            {adLocalPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {adLocalPreviews.map((preview, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-primary/30 bg-muted">
                    <PhotoThumbnail src={i < adPhotoUrls.length ? adPhotoUrls[i] : null} className="w-full h-full block">
                      <img src={preview} alt={`광고 사진 ${i + 1}`} className="w-full h-full object-cover" />
                    </PhotoThumbnail>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeAdPhoto(i); }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-90 transition-all z-10"
                      data-testid={`btn-remove-ad-photo-${i}`}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    {i >= adPhotoUrls.length && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => adFileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl border-4 border-dashed border-primary/30 bg-primary/5 active:scale-[0.98] transition-all"
              data-testid="btn-add-ad-photo"
            >
              {adUploadingCount > 0
                ? <><Loader2 className="w-7 h-7 text-primary animate-spin" /><span className="font-bold text-primary text-lg">업로드 중...</span></>
                : <><Camera className="w-7 h-7 text-primary" /><span className="font-bold text-primary text-lg">{adLocalPreviews.length > 0 ? '사진 추가하기' : '탭하여 사진 업로드'}</span></>
              }
            </button>
            <input ref={adFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAdFile} />
          </div>

          {/* Ad items evaluation */}
          {adGuideItems.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-secondary">항목별 가이드 일치 여부</h3>
                <p className="text-sm text-muted-foreground">광고 가이드와 일치하면 ○, 다르면 ✗를 선택하세요.</p>
              </div>
              {adGuideItems.map((item) => (
                <div key={item} className={`rounded-2xl border-2 overflow-hidden transition-all ${
                  adItems[item] === 'ok' ? 'border-blue-300 bg-blue-50'
                  : adItems[item] === 'notok' ? 'border-primary bg-red-50'
                  : 'border-border bg-white'
                }`}>
                  <div className="flex items-center justify-between p-4">
                    <h4 className="text-base font-bold text-secondary flex-1 pr-3">{item}</h4>
                    <div className="flex gap-3 shrink-0">
                      <button
                        onClick={() => setAdItems({ ...adItems, [item]: 'ok' })}
                        className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${
                          adItems[item] === 'ok' ? 'bg-blue-500 border-blue-600 text-white shadow-md' : 'bg-white border-border text-muted-foreground'
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
            <label className="text-base font-bold text-secondary">특이사항 (선택)</label>
            <textarea
              value={adNotes}
              onChange={e => setAdNotes(e.target.value)}
              placeholder="광고 관련 특이사항을 입력하세요..."
              rows={3}
              className="w-full rounded-2xl border-2 border-border bg-white px-4 py-3 text-base text-secondary placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none"
              data-testid="textarea-ad-notes"
            />
          </div>
        </div>
      )}

      {/* Quality Inspection Section */}
      {effectiveInspectionType === 'quality' && !qualityGuide && (
        <div className="bg-muted/30 rounded-3xl border border-border p-6 text-center text-muted-foreground">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>이 상품의 품질 가이드가 아직 등록되지 않았습니다.</p>
        </div>
      )}
      {effectiveInspectionType === 'quality' && qualityGuide && (
        <div className="space-y-5 pt-2">
          {qualityGuideImages.length > 0 && (
            <div className="bg-secondary text-white rounded-3xl p-4 shadow-xl space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="text-purple-400 w-6 h-6" />
                <h3 className="text-xl font-bold">품질 가이드</h3>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="w-full rounded-2xl overflow-hidden aspect-video bg-muted/20 border border-white/10 relative group active:scale-[0.98] transition-all">
                        <img src={qualityGuideImages[qualityImgIdx]} alt="Quality Guide" className="w-full h-full object-contain bg-white" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-white/90 text-secondary px-4 py-2 rounded-full font-bold text-sm">클릭하여 확대</span>
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] w-full p-0 border-none bg-transparent shadow-none">
                      <div className="w-full h-full flex items-center justify-center p-4">
                        <TransformWrapper initialScale={1} minScale={1} maxScale={4} centerOnInit>
                          <TransformComponent wrapperStyle={{ width: "100%", height: "90vh" }}>
                            <img src={qualityGuideImages[qualityImgIdx]} alt="Quality Guide Full" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white mx-auto" />
                          </TransformComponent>
                        </TransformWrapper>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {qualityGuideImages.length > 1 && (
                    <>
                      <button onClick={() => setQualityImgIdx(i => (i - 1 + qualityGuideImages.length) % qualityGuideImages.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-90 transition-all z-10">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button onClick={() => setQualityImgIdx(i => (i + 1) % qualityGuideImages.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-90 transition-all z-10">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
                {qualityGuideImages.length > 1 && (
                  <div className="flex justify-center items-center gap-1.5">
                    {qualityGuideImages.map((_, i) => (
                      <button key={i} onClick={() => setQualityImgIdx(i)}
                        className={`rounded-full transition-all ${i === qualityImgIdx ? 'w-4 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`} />
                    ))}
                    <span className="text-xs text-white/60 ml-1">{qualityImgIdx + 1}/{qualityGuideImages.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {qualityGuidePoints.length > 0 && (
            <div className="bg-muted/50 rounded-3xl border border-border p-5 space-y-3">
              <h4 className="text-lg font-bold text-secondary flex items-center gap-2">
                <div className="w-2 h-6 bg-purple-500 rounded-full" />품질 핵심 포인트
              </h4>
              <div className="space-y-2">
                {qualityGuidePoints.map((point, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-border/50 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">{i+1}</div>
                    <p className="text-base font-medium text-secondary leading-tight">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {qualityGuideAttachFiles.length > 0 && (
            <div className="bg-purple-50 rounded-3xl border border-purple-200 p-4 space-y-2">
              <h4 className="text-sm font-bold text-purple-700 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />첨부 파일
              </h4>
              <div className="flex flex-wrap gap-2">
                {qualityGuideAttachFiles.map((entry, i) => {
                  const { name, url } = parseFileEntry(entry);
                  return (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={name}
                      className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 transition-all text-white text-xs font-bold px-3 py-2 rounded-full shrink-0"
                      data-testid={`link-quality-attach-file-${i}`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="max-w-[140px] truncate">{name}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quality photo upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-secondary">현장 사진 촬영</h3>
              {qualityLocalPreviews.length > 0 && <span className="text-sm font-bold text-muted-foreground">{qualityLocalPreviews.length}장</span>}
            </div>
            {qualityLocalPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {qualityLocalPreviews.map((preview, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-purple-300 bg-muted">
                    <PhotoThumbnail src={i < qualityPhotoUrls.length ? qualityPhotoUrls[i] : null} className="w-full h-full block">
                      <img src={preview} alt={`품질 사진 ${i + 1}`} className="w-full h-full object-cover" />
                    </PhotoThumbnail>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeQualityPhoto(i); }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-90 transition-all z-10"
                      data-testid={`btn-remove-quality-photo-${i}`}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    {i >= qualityPhotoUrls.length && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => qualityFileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl border-4 border-dashed border-purple-400/40 bg-purple-50 active:scale-[0.98] transition-all"
              data-testid="btn-add-quality-photo"
            >
              {qualityUploadingCount > 0
                ? <><Loader2 className="w-7 h-7 text-purple-600 animate-spin" /><span className="font-bold text-purple-600 text-lg">업로드 중...</span></>
                : <><Camera className="w-7 h-7 text-purple-600" /><span className="font-bold text-purple-600 text-lg">{qualityLocalPreviews.length > 0 ? '사진 추가하기' : '탭하여 사진 업로드'}</span></>
              }
            </button>
            <input ref={qualityFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleQualityFile} />
          </div>

          {/* Quality items evaluation — Excel 방식 */}
          {qualityGuideItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-secondary">항목별 품질 점검</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">각 항목의 등급을 선택하세요 (A/B/C/E)</p>
                </div>
                {Object.keys(qualityItems).length > 0 && (() => {
                  const avg = calcOverallQualityScore(qualityItems);
                  const g = getQualityGrade(avg);
                  return (
                    <div className="text-right flex items-center gap-2">
                      <span className={`text-xl font-black px-3 py-1 rounded-full ${gradeColor(g)}`}>{g}등급</span>
                      <div>
                        <div className="text-2xl font-black text-purple-600">{avg}점</div>
                        <div className="text-xs text-muted-foreground">매장 평균</div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 기준 헤더 */}
              <div className="grid grid-cols-[1fr_repeat(4,2.5rem)] gap-1 px-2 text-xs font-bold text-muted-foreground text-center">
                <div className="text-left">아이템</div>
                {QUALITY_CRITERIA.map(c => <div key={c}>{c}</div>)}
              </div>

              {qualityGuideItems.map((item) => {
                const d = qualityItems[item] || {};
                const allFilled = d.선도 && d.상해 && d.규격 && d.혼입율;
                const itemScore = allFilled ? calcQualityItemScore(d as QualityGradeData) : null;
                return (
                  <div key={item} className={`rounded-2xl border-2 p-4 space-y-3 transition-all ${
                    allFilled ? (itemScore !== null && itemScore >= 90 ? 'border-purple-300 bg-purple-50' : 'border-primary/40 bg-red-50') : 'border-border bg-white'
                  }`}>
                    {/* 항목명 + 점수 + 출력 등급 */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-secondary">{item}</h4>
                      {allFilled && itemScore !== null && (() => {
                        const g = getQualityGrade(itemScore);
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${gradeColor(g)}`}>{g}</span>
                            <span className={`text-sm font-black px-2.5 py-1 rounded-full ${gradeColor(g)}`}>{itemScore}점</span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* 4개 기준 — 한 줄에 */}
                    <div className="grid grid-cols-[1fr_repeat(4,2.5rem)] gap-1 items-center">
                      <div className="text-xs text-muted-foreground font-medium">등급</div>
                      {QUALITY_CRITERIA.map(criterion => (
                        <div key={criterion} className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground">{criterion}</span>
                          <div className="flex flex-col gap-1">
                            {(['A','B','C','E'] as const).map(grade => (
                              <button
                                key={grade}
                                onClick={() => setQualityItems({ ...qualityItems, [item]: { ...d, [criterion]: grade } })}
                                className={`w-10 h-10 rounded-xl border-2 font-black text-sm transition-all active:scale-95 ${
                                  (d as any)[criterion] === grade
                                    ? grade === 'A' ? 'bg-purple-600 border-purple-700 text-white'
                                    : grade === 'B' ? 'bg-purple-400 border-purple-500 text-white'
                                    : grade === 'C' ? 'bg-amber-400 border-amber-500 text-white'
                                    : 'bg-red-500 border-red-600 text-white'
                                    : 'bg-white border-border text-muted-foreground'
                                }`}
                                data-testid={`btn-quality-${item}-${criterion}-${grade}`}
                              >
                                {grade}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 감점 입력 */}
                    <div className="flex gap-3 pt-1 border-t border-border/50">
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-muted-foreground block mb-1">진열기한 경과 (개) × -2점</label>
                        <input
                          type="number"
                          min={0}
                          value={(d as QualityGradeData).expired ?? ''}
                          onChange={e => setQualityItems({ ...qualityItems, [item]: { ...d, expired: Math.max(0, parseInt(e.target.value) || 0) } })}
                          placeholder="0"
                          className="w-full px-3 py-2 rounded-xl border-2 border-border text-sm font-bold text-center focus:outline-none focus:border-purple-400 bg-white"
                          data-testid={`input-quality-expired-${item}`}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-muted-foreground block mb-1">곰팡이 (개) × -5점</label>
                        <input
                          type="number"
                          min={0}
                          value={(d as QualityGradeData).moldy ?? ''}
                          onChange={e => setQualityItems({ ...qualityItems, [item]: { ...d, moldy: Math.max(0, parseInt(e.target.value) || 0) } })}
                          placeholder="0"
                          className="w-full px-3 py-2 rounded-xl border-2 border-border text-sm font-bold text-center focus:outline-none focus:border-red-400 bg-white"
                          data-testid={`input-quality-moldy-${item}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* 전체 진행 현황 */}
              <div className="flex justify-between text-sm font-medium text-muted-foreground bg-muted/40 rounded-2xl px-4 py-3">
                <span>{qualityGuideItems.filter(item => {const d=qualityItems[item];return d&&d.선도&&d.상해&&d.규격&&d.혼입율}).length} / {qualityGuideItems.length} 완료</span>
                {Object.keys(qualityItems).length > 0 && (() => {
                  const avg = calcOverallQualityScore(qualityItems);
                  const g = getQualityGrade(avg);
                  return <span className="font-bold text-purple-600">평균 {avg}점 ({g}등급)</span>;
                })()}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-base font-bold text-secondary">특이사항 (선택)</label>
            <textarea
              value={qualityNotes}
              onChange={e => setQualityNotes(e.target.value)}
              placeholder="품질 관련 특이사항을 입력하세요..."
              rows={3}
              className="w-full rounded-2xl border-2 border-border bg-white px-4 py-3 text-base text-secondary placeholder:text-muted-foreground focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 resize-none"
              data-testid="textarea-quality-notes"
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
