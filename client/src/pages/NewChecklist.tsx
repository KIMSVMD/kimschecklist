import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useCreateChecklist, useUploadPhoto } from "@/hooks/use-checklists";
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
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { 
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import bananaImg from "@assets/image_1772521947455.png";

const REGIONS = {
  '수도권': ['강서', '강남', '송파', '야탑', '분당', '신구로', '구의', '불광', '평촌', '부천', '일산', '광명', '동수원', '산본', '중계', '고잔', '김포', '인천'],
  '지방': ['대전', '해운대', '괴정', '쇼핑', '수성']
};

const CATEGORIES = ['농산', '수산', '축산', '공산'];

const PRODUCTS = {
  '농산': ['[시즌]딸기', '[시즌]만감류', '[시즌]오렌지', '[시즌]참외', '[시즌]수박', '[시즌]복숭아', '[시즌]사과', '[시즌]배', '[시즌]포도', '[시즌]감', '[시즌]감귤', '[데일리]토마토', '[데일리]사과', '[수입]바나나', '[수입]수입과일', '[수입]키위', '[채소]제주채소', '[양곡]'],
  '수산': ['[견과]', '[간편식]'],
  '축산': ['[돈육]', '[한우]암소한우', '[한우]시즈닝 스테이크', '[수입육]', '[양념육]', '[계육]'],
  '공산': ['[직수입]', '[건기식]', '[공산행사장]']
};

const PRODUCT_GUIDES: Record<string, { image: string, points: string[], items: string[] }> = {
  '[수입]바나나': {
    image: bananaImg,
    points: [
      "상품: 바나나 3SKU(앵커/유기농/프리미엄)",
      "위치: 입구 위치 고정화",
      "면적: 앵커 60% / 유기농 20% / 프리미엄 20%",
      "진열: ①앵커 -> 유기농 -> 프리미엄순",
      "진열: ②후숙도 구분(덜익 -> 중강 -> 잘익)",
      "진열: ③곡면 소도구 활용",
      "연출: 잎 그래픽 바닥 시트",
      "광고: 바나나 셀링"
    ],
    items: [
      "상품: 바나나 3SKU(앵커/유기농/프리미엄)",
      "위치: 입구 위치 고정화",
      "면적: 앵커 60% / 유기농 20% / 프리미엄 20%",
      "진열: ①앵커 -> 유기농 -> 프리미엄순",
      "진열: ②후숙도 구분(덜익 -> 중강 -> 잘익)",
      "진열: ③곡면 소도구 활용",
      "연출: 잎 그래픽 바닥 시트",
      "광고: 바나나 셀링"
    ]
  }
};

export default function NewChecklist() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    branch: "",
    category: "",
    product: "",
    status: "",
    photoUrl: "",
    notes: "",
    items: {} as Record<string, string>
  });

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const nextStep = () => setStep(p => Math.min(p + 1, 4));
  const prevStep = () => setStep(p => Math.max(p - 1, 1));

  return (
    <Layout title="새 점검 등록" showBack={true}>
      <div className="flex flex-col h-full bg-background relative">
        {/* Progress Bar */}
        <div className="w-full bg-muted h-2">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: "25%" }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <Step1Branch 
                key="step1" 
                selected={formData.branch} 
                onSelect={(v) => { updateForm('branch', v); nextStep(); }} 
              />
            )}
            {step === 2 && (
              <Step2Category 
                key="step2" 
                selected={formData.category} 
                onSelect={(v) => { updateForm('category', v); updateForm('product', ''); nextStep(); }} 
              />
            )}
            {step === 3 && (
              <Step3Product 
                key="step3" 
                category={formData.category}
                selected={formData.product} 
                onSelect={(v) => { updateForm('product', v); nextStep(); }} 
              />
            )}
            {step === 4 && (
              <Step4Input 
                key="step4" 
                formData={formData} 
                updateForm={updateForm}
                onSubmit={() => {
                  toast({ title: "제출 중..." });
                }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Floating Back Button for steps > 1 */}
        {step > 1 && (
          <div className="p-4 bg-white/80 backdrop-blur-md border-t border-border/50">
            <button 
              onClick={prevStep}
              className="w-full py-4 rounded-2xl bg-muted text-secondary font-bold text-lg active:scale-[0.98] transition-all"
            >
              이전 단계
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

function Step2Category({ selected, onSelect }: { selected: string, onSelect: (v: string) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-secondary flex items-center gap-3">
          <Layers className="text-primary w-8 h-8" /> 대분류 선택
        </h2>
        <p className="text-muted-foreground text-lg">어떤 카테고리인가요?</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all active:scale-[0.98] ${
              selected === cat 
              ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20' 
              : 'border-border bg-white text-secondary hover:border-primary/50 shadow-sm'
            }`}
          >
            <span className="text-3xl font-bold">{cat}</span>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selected === cat ? 'bg-white/20' : 'bg-muted'}`}>
              <Package className={selected === cat ? 'text-white' : 'text-muted-foreground'} />
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function Step3Product({ category, selected, onSelect }: { category: string, selected: string, onSelect: (v: string) => void }) {
  const products = category ? PRODUCTS[category as keyof typeof PRODUCTS] : [];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-secondary flex items-center gap-3">
          <Package className="text-primary w-8 h-8" /> 세부상품 선택
        </h2>
        <p className="text-muted-foreground text-lg"><strong className="text-primary">{category}</strong> 카테고리의 상품입니다.</p>
      </div>

      <div className="flex flex-col gap-3">
        {products.map(prod => {
          const match = prod.match(/\[(.*?)\](.*)/);
          const tag = match ? match[1] : '';
          const name = match ? match[2] : prod;

          return (
            <button
              key={prod}
              onClick={() => onSelect(prod)}
              className={`flex items-center text-left p-5 min-h-[5rem] rounded-2xl border-2 transition-all active:scale-[0.98] ${
                selected === prod 
                ? 'border-primary bg-primary/5 text-secondary shadow-md' 
                : 'border-border bg-white text-secondary hover:border-primary/30'
              }`}
            >
              {tag && (
                <span className={`px-3 py-1.5 rounded-lg text-sm font-bold mr-4 shrink-0 ${
                  selected === prod ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {tag}
                </span>
              )}
              <span className="text-2xl font-bold truncate leading-tight">{name}</span>
            </button>
          )
        })}
      </div>
    </motion.div>
  );
}

function Step4Input({ formData, updateForm }: { formData: any, updateForm: any, onSubmit: () => void }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateChecklist();
  const uploadMutation = useUploadPhoto();
  
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show instant local preview
    setLocalPreview(URL.createObjectURL(file));

    try {
      // Upload to backend
      const url = await uploadMutation.mutateAsync(file);
      updateForm('photoUrl', url);
    } catch (err) {
      toast({ title: "업로드 실패", description: "사진을 다시 업로드해주세요.", variant: "destructive" });
      setLocalPreview(null);
    }
  };

  const submitForm = async () => {
    const hasPoor = Object.values(formData.items).includes('poor');
    const finalStatus = hasPoor ? 'poor' : 'excellent'; // Simplified logic for overall status
    
    try {
      await createMutation.mutateAsync({
        branch: formData.branch,
        category: formData.category,
        product: formData.product,
        status: finalStatus,
        photoUrl: formData.photoUrl || null,
        notes: formData.notes || null,
        items: formData.items,
      });
      
      toast({ title: "제출 완료!", description: "점검이 성공적으로 등록되었습니다." });
      setLocation('/dashboard');
    } catch (err) {
      toast({ title: "제출 실패", description: String(err), variant: "destructive" });
    }
  };

  const guide = PRODUCT_GUIDES[formData.product];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-10"
    >
      <div className="space-y-2 border-b-2 border-border pb-4">
        <h2 className="text-2xl font-black text-secondary">
          {formData.branch} <span className="text-muted-foreground font-normal">|</span> {formData.product}
        </h2>
      </div>

      {/* Visual Guide Section */}
      <div className="space-y-4">
        <div className="bg-secondary text-white rounded-3xl p-4 shadow-xl space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <ImageIcon className="text-primary w-6 h-6" />
            <h3 className="text-xl font-bold">표준 진열 가이드</h3>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <button className="w-full rounded-2xl overflow-hidden aspect-video bg-muted/20 border border-white/10 relative group active:scale-[0.98] transition-all">
                <img 
                  src={guide?.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=450&fit=crop"} 
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
                <TransformWrapper
                  initialScale={1}
                  minScale={1}
                  maxScale={4}
                  centerOnInit={true}
                >
                  <TransformComponent wrapperStyle={{ width: "100%", height: "90vh" }}>
                    <img 
                      src={guide?.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=800&fit=crop"} 
                      alt="Standard Guide Full" 
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white mx-auto"
                    />
                  </TransformComponent>
                </TransformWrapper>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Key Points Box - Separated and Scrollable */}
        <div className="bg-muted/50 rounded-3xl border border-border p-5 space-y-3">
          <h4 className="text-lg font-bold text-secondary flex items-center gap-2">
            <div className="w-2 h-6 bg-primary rounded-full" />
            진열 핵심 포인트
          </h4>
          <div className="overflow-y-auto max-h-[200px] pr-2 space-y-2.5 scrollbar-thin scrollbar-thumb-primary/20">
            {(guide?.points || [
              "상품이 풍성해 보이도록 전진 진열",
              "시즌 소품 활용"
            ]).map((point, i) => (
              <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-border/50 shadow-sm">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">{i+1}</div>
                <p className="text-base font-medium text-secondary leading-tight">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

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
          
          {/* Guide Overlay - 30% transparency */}
          <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-multiply">
            <img 
              src={guide?.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=800&fit=crop"} 
              className="w-full h-full object-contain bg-white grayscale" 
              alt="Guide Overlay" 
            />
          </div>

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
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-secondary">항목별 진열 상태 평가</h3>
        {(guide?.items || ["기본 진열 상태"]).map((item) => (
          <div key={item} className="space-y-3 p-4 bg-muted/30 rounded-2xl border border-border/50">
            <h4 className="text-lg font-bold text-secondary">{item}</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'excellent', label: '우수', icon: CheckCircle2, color: 'blue' },
                { id: 'average', label: '보통', icon: AlertTriangle, color: 'amber' },
                { id: 'poor', label: '미흡', icon: XOctagon, color: 'red' }
              ].map((s) => (
                <button 
                  key={s.id}
                  onClick={() => updateForm('items', { ...formData.items, [item]: s.id })}
                  className={`flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all active:scale-95 ${
                    formData.items[item] === s.id 
                    ? `bg-${s.color === 'red' ? 'primary' : s.color + '-500'} border-${s.color === 'red' ? 'red-700' : s.color + '-600'} text-white shadow-md` 
                    : `bg-white border-border text-muted-foreground hover:border-${s.color}-200`
                  }`}
                >
                  <s.icon className="w-8 h-8 mb-1" />
                  <span className="text-sm font-bold">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

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
        disabled={createMutation.isPending || uploadMutation.isPending || !formData.status}
        className="w-full py-6 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-white font-black text-2xl shadow-xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 flex justify-center items-center gap-2 mt-8"
      >
        {createMutation.isPending ? <Loader2 className="w-8 h-8 animate-spin" /> : "점검 완료 및 제출"}
      </button>

    </motion.div>
  );
}
