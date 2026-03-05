import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useCreateChecklist, useUploadPhoto } from "@/hooks/use-checklists";
import { useGuideByProduct } from "@/hooks/use-guides";
import { useProducts } from "@/hooks/use-products";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, 
  Layers, 
  Package, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  XOctagon,
  Image as ImageIcon,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Droplets,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { calcVMScore, scoreColor } from "@/lib/scoring";

const REGIONS = {
  '수도권': ['강서', '강남', '송파', '야탑', '분당', '신구로', '구의', '불광', '평촌', '부천', '일산', '광명', '동수원', '산본', '중계', '고잔', '김포', '인천'],
  '지방': ['대전', '해운대', '괴정', '쇼핑', '수성']
};

const CATEGORIES = ['농산', '수산', '축산', '공산'];

type SelectStage = 'type' | 'category' | 'group' | 'product';

export default function NewChecklist() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);

  // Step 2 sub-stage lifted to parent for unified back navigation
  const [stage, setStage] = useState<SelectStage>('type');
  const [selCategory, setSelCategory] = useState('');
  const [selGroup, setSelGroup] = useState('');

  const [formData, setFormData] = useState({
    branch: "",
    category: "",
    product: "",
    photoUrl: "",
    notes: "",
    items: {} as Record<string, string>
  });

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Unified back handler covering all steps and sub-stages
  const handlePrev = () => {
    if (step === 3) {
      setStage('type');
      setSelCategory('');
      setSelGroup('');
      setStep(2);
    } else if (step === 2) {
      if (stage === 'product') { setStage('group'); setSelGroup(''); }
      else if (stage === 'group') { setStage('category'); setSelCategory(''); }
      else if (stage === 'category') { setStage('type'); }
      else { setStep(1); } // stage === 'type'
    }
  };

  // Whether to show the back button
  const showBack = step === 3 || (step === 2 && stage !== 'type') || (step === 2 && stage === 'type');

  // Label for the back button
  const backLabel = (() => {
    if (step === 3) return '상품 선택';
    if (step === 2) {
      if (stage === 'category') return '유형 선택';
      if (stage === 'group') return '카테고리 선택';
      if (stage === 'product') return '그룹 선택';
      return '지점 선택'; // stage === 'type'
    }
    return '이전';
  })();

  // Progress percentage
  const progressMap: Record<string, number> = {
    // step 1
    '1-': 33,
    // step 2 sub-stages
    '2-type': 40,
    '2-category': 50,
    '2-group': 60,
    '2-product': 70,
    // step 3
    '3-': 100,
  };
  const progressKey = step === 2 ? `2-${stage}` : `${step}-`;
  const progressPct = progressMap[progressKey] ?? 33;

  return (
    <Layout title="새 점검 등록" showBack={true}>
      <div className="flex flex-col h-full bg-background relative">
        <div className="w-full bg-muted h-2">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: "33%" }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <Step1Branch 
                key="step1" 
                selected={formData.branch} 
                onSelect={(v) => { updateForm('branch', v); setStep(2); }} 
              />
            )}
            {step === 2 && (
              <Step2Select
                key="step2"
                branch={formData.branch}
                stage={stage}
                setStage={setStage}
                selCategory={selCategory}
                setSelCategory={setSelCategory}
                selGroup={selGroup}
                setSelGroup={setSelGroup}
                onSelect={(category, product) => {
                  updateForm('category', category);
                  updateForm('product', product);
                  updateForm('items', {});
                  setStep(3);
                }}
              />
            )}
            {step === 3 && (
              <Step4Input 
                key="step3" 
                formData={formData} 
                updateForm={updateForm}
                onSubmit={() => {}}
              />
            )}
          </AnimatePresence>
        </div>

        {showBack && (
          <div className="p-4 bg-white/80 backdrop-blur-md border-t border-border/50">
            <button 
              onClick={handlePrev}
              className="w-full py-4 rounded-2xl bg-muted text-secondary font-bold text-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              data-testid="btn-prev-step"
            >
              <ChevronLeft className="w-5 h-5" /> {backLabel}로 돌아가기
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

function Step1Branch({ selected, onSelect }: { selected: string, onSelect: (v: string) => void }) {
  const [region, setRegion] = useState<'수도권'|'지방'>('수도권');

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-secondary flex items-center gap-3">
          <MapPin className="text-primary w-8 h-8" /> 지점 선택
        </h2>
        <p className="text-muted-foreground text-lg">점검을 진행할 지점을 선택해주세요.</p>
      </div>

      <div className="flex bg-muted p-1.5 rounded-2xl">
        <button 
          onClick={() => setRegion('수도권')}
          className={`flex-1 py-4 text-xl font-bold rounded-xl transition-all ${region === '수도권' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'}`}
        >
          수도권
        </button>
        <button 
          onClick={() => setRegion('지방')}
          className={`flex-1 py-4 text-xl font-bold rounded-xl transition-all ${region === '지방' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'}`}
        >
          지방
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {REGIONS[region].map(branch => (
          <button
            key={branch}
            onClick={() => onSelect(branch)}
            className={`min-h-[4.5rem] px-4 rounded-2xl border-2 text-xl font-bold transition-all active:scale-[0.97] ${
              selected === branch 
              ? 'border-primary bg-primary/5 text-primary' 
              : 'border-border bg-white text-secondary hover:border-primary/30'
            }`}
          >
            {branch}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

type Step2Props = {
  branch: string;
  stage: SelectStage;
  setStage: (s: SelectStage) => void;
  selCategory: string;
  setSelCategory: (v: string) => void;
  selGroup: string;
  setSelGroup: (v: string) => void;
  onSelect: (category: string, product: string) => void;
};

function Step2Select({ branch, stage, setStage, selCategory, setSelCategory, selGroup, setSelGroup, onSelect }: Step2Props) {
  const [, setLocation] = useLocation();

  const { data: dbProducts = [], isLoading } = useProducts(selCategory);
  const groups = [...new Set(dbProducts.map(p => p.groupName))];

  const handleCategorySelect = (cat: string) => {
    setSelCategory(cat);
    setSelGroup('');
    setStage('group');
  };

  const handleGroupSelect = (group: string) => {
    const subs = dbProducts.filter(p => p.groupName === group && p.productName);
    if (subs.length === 0) {
      onSelect(selCategory, `[${group}]`);
    } else {
      setSelGroup(group);
      setStage('product');
    }
  };

  const handleProductSelect = (productName: string) => {
    onSelect(selCategory, `[${selGroup}]${productName}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* ── STAGE: type ── */}
      {stage === 'type' && (
        <>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-secondary flex items-center gap-3">
              <Layers className="text-primary w-8 h-8" /> 점검 유형 선택
            </h2>
            <p className="text-muted-foreground text-lg">어떤 점검을 진행하나요?</p>
          </div>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setLocation(`/cleaning/new?branch=${encodeURIComponent(branch)}`)}
              className="flex items-center justify-between p-6 rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]"
              data-testid="btn-cleaning-select"
            >
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl"><Droplets className="w-8 h-8" /></div>
                <div className="text-left">
                  <h3 className="text-2xl font-black">매장 청소 점검</h3>
                  <p className="text-emerald-100 text-sm font-medium mt-0.5">입구 · 농산 · 축산 · 수산 · 공산</p>
                </div>
              </div>
              <ChevronRight className="w-8 h-8 opacity-70" />
            </button>
            <button
              onClick={() => setStage('category')}
              className="flex items-center justify-between p-6 rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              data-testid="btn-vm-select"
            >
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl"><Package className="w-8 h-8" /></div>
                <div className="text-left">
                  <h3 className="text-2xl font-black">진열가이드 점검</h3>
                  <p className="text-red-100 text-sm font-medium mt-0.5">VM 점검 · 농산 · 수산 · 축산 · 공산</p>
                </div>
              </div>
              <ChevronRight className="w-8 h-8 opacity-70" />
            </button>
          </div>
        </>
      )}

      {/* ── STAGE: category ── */}
      {stage === 'category' && (
        <>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-secondary flex items-center gap-3">
              <Layers className="text-primary w-8 h-8" /> 카테고리 선택
            </h2>
            <p className="text-muted-foreground text-lg">점검할 매장 카테고리를 선택하세요.</p>
          </div>
          <div className="flex flex-col gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className="flex items-center justify-between p-6 rounded-3xl border-2 border-border bg-white text-secondary hover:border-primary/50 shadow-sm transition-all active:scale-[0.98]"
                data-testid={`btn-category-${cat}`}
              >
                <span className="text-3xl font-bold">{cat}</span>
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Package className="text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── STAGE: group ── */}
      {stage === 'group' && (
        <>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-secondary flex items-center gap-3">
              <Package className="text-primary w-8 h-8" /> 상품 그룹 선택
            </h2>
            <p className="text-muted-foreground text-lg">
              <strong className="text-primary">{selCategory}</strong> 그룹을 선택하세요.
            </p>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>등록된 상품이 없습니다.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {groups.map(group => {
                const cnt = dbProducts.filter(p => p.groupName === group && p.productName).length;
                return (
                  <button
                    key={group}
                    onClick={() => handleGroupSelect(group)}
                    className="flex items-center justify-between p-5 min-h-[5rem] rounded-2xl border-2 border-border bg-white text-secondary hover:border-primary/40 transition-all active:scale-[0.98] shadow-sm"
                    data-testid={`button-group-${group}`}
                  >
                    <span className="text-2xl font-bold">{group}</span>
                    <div className="flex items-center gap-2">
                      {cnt > 0 && <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg font-medium">{cnt}개</span>}
                      <ChevronRight className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── STAGE: product ── */}
      {stage === 'product' && (
        <>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-secondary flex items-center gap-3">
              <Package className="text-primary w-8 h-8" /> 상품 선택
            </h2>
            <p className="text-muted-foreground text-lg">
              <strong className="text-primary">{selGroup}</strong>의 상품을 선택하세요.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {dbProducts.filter(p => p.groupName === selGroup && p.productName).map(p => (
              <button
                key={p.id}
                onClick={() => handleProductSelect(p.productName!)}
                className="flex items-center justify-between p-5 min-h-[5rem] rounded-2xl border-2 border-border bg-white text-secondary hover:border-primary/30 transition-all active:scale-[0.98] shadow-sm"
                data-testid={`button-product-${p.id}`}
              >
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-lg text-sm font-bold shrink-0 bg-muted text-muted-foreground">{selGroup}</span>
                  <span className="text-2xl font-bold">{p.productName}</span>
                </div>
                <ChevronRight className="w-6 h-6 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}

function Step4Input({ formData, updateForm }: { formData: any, updateForm: any, onSubmit: () => void }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateChecklist();
  const uploadMutation = useUploadPhoto();
  const { data: dbGuide, isLoading: guideLoading } = useGuideByProduct(formData.product);
  
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [itemMemos, setItemMemos] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalPreview(URL.createObjectURL(file));
    try {
      const url = await uploadMutation.mutateAsync(file);
      updateForm('photoUrl', url);
    } catch (err) {
      toast({ title: "업로드 실패", description: "사진을 다시 업로드해주세요.", variant: "destructive" });
      setLocalPreview(null);
    }
  };

  const submitForm = async () => {
    const hasPoor = Object.values(formData.items).includes('poor');
    const hasAverage = Object.values(formData.items).includes('average');
    const finalStatus = hasPoor ? 'poor' : hasAverage ? 'average' : 'excellent';

    // Append item memos to notes
    const memoLines = Object.entries(itemMemos)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `[미흡] ${k}: ${v}`);
    const combinedNotes = [formData.notes, ...memoLines].filter(Boolean).join('\n');
    
    try {
      const created = await createMutation.mutateAsync({
        branch: formData.branch,
        category: formData.category,
        product: formData.product,
        status: finalStatus,
        photoUrl: formData.photoUrl || null,
        notes: combinedNotes || null,
        items: formData.items,
      });
      
      toast({ title: "제출 완료!", description: "수정이 필요하면 아래에서 변경하세요." });
      setLocation(`/checklist/edit/${created.id}`);
    } catch (err) {
      toast({ title: "제출 실패", description: String(err), variant: "destructive" });
    }
  };

  const guideImage = dbGuide?.imageUrl || null;
  const guidePoints: string[] = (dbGuide?.points as string[]) || [];
  const guideItems: string[] = (dbGuide?.items as string[])?.filter(Boolean) || [];

  const hasGuide = !!dbGuide;
  const allItemsEvaluated = guideItems.length === 0 || guideItems.every(item => formData.items[item]);

  const displayProduct = formData.product
    ? formData.product.replace(/\[(.*?)\]/, (_, g: string) => g ? `${g} > ` : '')
    : '';

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-10"
    >
      <div className="space-y-1 border-b-2 border-border pb-4">
        <p className="text-sm text-muted-foreground font-medium">{formData.branch}점 · {formData.category}</p>
        <h2 className="text-2xl font-black text-secondary">{displayProduct || formData.product}</h2>
      </div>

      {/* Visual Guide Section */}
      {guideLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : hasGuide ? (
        <div className="space-y-4">
          <div className="bg-secondary text-white rounded-3xl p-4 shadow-xl space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <ImageIcon className="text-primary w-6 h-6" />
              <h3 className="text-xl font-bold">표준 진열 가이드</h3>
            </div>
            
            {guideImage ? (
              <Dialog>
                <DialogTrigger asChild>
                  <button className="w-full rounded-2xl overflow-hidden aspect-video bg-muted/20 border border-white/10 relative group active:scale-[0.98] transition-all">
                    <img 
                      src={guideImage} 
                      alt="Standard Guide" 
                      className="w-full h-full object-contain bg-white"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-white/90 text-secondary px-4 py-2 rounded-full font-bold text-sm shadow-lg">클릭하여 확대</span>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] w-full p-0 border-none bg-transparent shadow-none">
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <TransformWrapper initialScale={1} minScale={1} maxScale={4} centerOnInit={true}>
                      <TransformComponent wrapperStyle={{ width: "100%", height: "90vh" }}>
                        <img 
                          src={guideImage} 
                          alt="Standard Guide Full" 
                          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white mx-auto"
                        />
                      </TransformComponent>
                    </TransformWrapper>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="w-full rounded-2xl aspect-video bg-muted/20 border border-white/10 flex items-center justify-center">
                <div className="text-center text-white/60">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">이미지 없음</p>
                </div>
              </div>
            )}
          </div>

          {guidePoints.length > 0 && (
            <div className="bg-muted/50 rounded-3xl border border-border p-5 space-y-3">
              <h4 className="text-lg font-bold text-secondary flex items-center gap-2">
                <div className="w-2 h-6 bg-primary rounded-full" />
                진열 핵심 포인트
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
          <p className="text-base">이 상품의 진열 가이드가 아직 등록되지 않았습니다.</p>
        </div>
      )}

      {/* Photo Upload */}
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-secondary">현장 사진 촬영</h3>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full relative aspect-video rounded-3xl border-4 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center overflow-hidden active:scale-[0.98] transition-all group"
        >
          {localPreview ? (
            <img src={localPreview} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
          ) : null}
          
          {guideImage && (
            <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-multiply">
              <img 
                src={guideImage} 
                className="w-full h-full object-contain bg-white grayscale" 
                alt="Guide Overlay" 
              />
            </div>
          )}

          <div className={`relative z-10 flex flex-col items-center p-6 rounded-2xl backdrop-blur-sm ${localPreview ? 'bg-black/50 text-white' : 'bg-white/80 text-primary'}`}>
            {uploadMutation.isPending ? (
              <Loader2 className="w-12 h-12 animate-spin mb-2" />
            ) : (
              <Camera className="w-12 h-12 mb-2" />
            )}
            <span className="font-bold text-lg">
              {localPreview ? '다시 촬영하기' : '탭하여 사진 촬영'}
            </span>
          </div>
        </button>
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          onChange={handleFile}
        />
      </div>

      {/* Per-item Status Check */}
      {guideItems.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-secondary">항목별 진열 상태 평가</h3>
            {guideItems.length > 0 && (() => {
              const score = calcVMScore(formData.items, formData.photoUrl);
              const evaluated = Object.keys(formData.items).length;
              const total = guideItems.length + 1;
              return (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-black ${scoreColor(score)}`}
                  data-testid="text-vm-score">
                  <span className="text-lg">{score}점</span>
                  <span className="text-xs font-normal opacity-70">{evaluated}/{total}</span>
                </div>
              );
            })()}
          </div>
          {guideItems.map((item) => (
            <div key={item} className="space-y-3 p-4 bg-muted/30 rounded-2xl border border-border/50">
              <h4 className="text-lg font-bold text-secondary">{item}</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'excellent', label: '우수', icon: CheckCircle2, active: 'bg-blue-500 border-blue-600 text-white shadow-md', inactive: 'bg-white border-border text-muted-foreground' },
                  { id: 'poor', label: '미흡', icon: XOctagon, active: 'bg-primary border-red-700 text-white shadow-md', inactive: 'bg-white border-border text-muted-foreground' }
                ].map((s) => (
                  <button 
                    key={s.id}
                    onClick={() => updateForm('items', { ...formData.items, [item]: s.id })}
                    className={`flex flex-col items-center justify-center py-5 rounded-xl border-2 transition-all active:scale-95 ${
                      formData.items[item] === s.id ? s.active : s.inactive
                    }`}
                  >
                    <s.icon className="w-9 h-9 mb-1.5" />
                    <span className="text-base font-bold">{s.label}</span>
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {formData.items[item] === 'poor' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <textarea
                      placeholder="미흡 이유를 기재해주세요..."
                      value={itemMemos[item] || ''}
                      onChange={e => setItemMemos(prev => ({ ...prev, [item]: e.target.value }))}
                      className="w-full p-4 rounded-xl border-2 border-red-200 bg-white text-base focus:outline-none focus:border-primary transition-all resize-none h-20 mt-1"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-secondary">특이사항 (선택)</h3>
        <textarea 
          placeholder="VM 집기 부족/파손/광고물 요청 등..."
          className="w-full p-5 rounded-2xl border-2 border-border bg-white text-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all min-h-[8rem] resize-none"
          value={formData.notes}
          onChange={(e) => updateForm('notes', e.target.value)}
        />
      </div>

      {/* Submit Button */}
      <button 
        onClick={submitForm}
        disabled={createMutation.isPending || uploadMutation.isPending || !allItemsEvaluated}
        className="w-full py-6 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-white font-black text-2xl shadow-xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 flex justify-center items-center gap-2 mt-8"
      >
        {createMutation.isPending ? <Loader2 className="w-8 h-8 animate-spin" /> : "점검 완료 및 제출"}
      </button>

      {guideItems.length > 0 && !allItemsEvaluated && (
        <p className="text-center text-sm text-muted-foreground -mt-4">모든 평가 항목을 선택해주세요</p>
      )}
    </motion.div>
  );
}
