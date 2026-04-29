import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCreateChecklist, useUpdateChecklist } from "@/hooks/use-checklists";
import { useProducts } from "@/hooks/use-products";
import { useQualityGuidesByProduct, useValidGuideProducts } from "@/hooks/use-guides";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Camera, Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// ── 정적 품목 목록 ────────────────────────────────────────────────────────────

const CHEONGWA_ITEMS = [
  '사과', '배', '딸기', '참외', '밤', '수박', '바나나', '오렌지', '키위', '블루베리',
  '수입포도', '용과', '파인애플', '아보카도', '자몽', '레몬', '망고', '감귤', '한라봉',
  '레드향', '샤인머스켓', '방울토마토', '토마토',
];

const CHAESO_ITEMS = [
  '콜라비', '블로컬리', '양배추', '적채', '비트', '바타비아', '샐러리', '유러피안채소',
  '샐러드', '양상추', '애호박', '오이', '파프리카', '청양고추', '풋고추', '꽈리고추',
  '오이맛고추', '홍고추', '피망', '가지', '단호박', '허브채소', '양파', '대파', '깐마늘',
  '생강', '팽이버섯', '새송이버섯', '느타리버섯', '표고버섯', '양송이버섯', '머쉬멜로버섯',
  '시금치', '미나리', '모둠쌈', '상추', '깻잎', '청경채', '열무', '얼갈이', '쪽파',
  '고구마', '감자', '당근', '연근', '무', '배추', '부추', '아스파라거스',
];

const CHUKSAN_ITEMS = [
  '삼겹살(냉장)', '목심(냉장)', '앞다리(냉장)', '등갈비(냉장)', '갈비찜(냉장)',
  '보쌈/수육(냉장)', '항정살(냉장)', '한우불고기(냉장)', '한우국거리(냉장)', '한우등심(냉장)',
  '한우안심(냉장)', '한우채끝(냉장)', '한우부채살(냉장)', '척아이롤_미국', '부채살_미국',
  '살치살_미국', '갈비찜용_미국', '국거리_미국', '부채살(와규)_호주', '치마살(와규)_호주',
  '삼각살(와규)_호주', '스테이크(와규)_호주', '국거리(와규)_호주', '불고기(와규)_호주',
  '갈비찜용_호주', '부채살_호주', '살치살_호주', '척아이롤_호주', '립캡(와규)_호주', '치마살_호주',
];

// ── 타입 ──────────────────────────────────────────────────────────────────────

type QualityCategory = '청과' | '채소' | '수산' | '축산';

const ALL_CATEGORIES: QualityCategory[] = ['청과', '채소', '수산', '축산'];

const CRITERIA_MAP: Record<QualityCategory, string[]> = {
  청과: ['선도', '상해', '규격', '혼입율'],
  채소: ['선도', '상해', '규격', '혼입율'],
  수산: ['선도', '상해', '규격', '혼입율'],
  축산: ['색택', '마블링', '선도'],
};

const PARENT_CATEGORY: Record<QualityCategory, string> = {
  청과: '농산',
  채소: '농산',
  수산: '수산',
  축산: '축산',
};

type ProductData = {
  grades: Record<string, string>;
  expired: number;
  moldy: number;
};

type BulkData = Record<string, ProductData>;

// ── 가이드 사진 슬라이드 ──────────────────────────────────────────────────────

function GuideImageSlide({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  if (images.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-sm bg-muted/10 space-y-2 p-3">
      <p className="text-xs font-bold text-primary">품질 가이드 사진</p>
      <div className="relative">
        <Dialog>
          <DialogTrigger asChild>
            <button className="w-full rounded-xl overflow-hidden aspect-video bg-muted/20 relative group active:scale-[0.98] transition-all">
              <img src={images[idx]} alt="품질 가이드" className="w-full h-full object-contain bg-white" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-white/90 text-secondary px-3 py-1.5 rounded-full font-bold text-xs">클릭하여 확대</span>
              </div>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] w-full p-0 border-none bg-transparent shadow-none">
            <div className="w-full h-full flex items-center justify-center p-4">
              <TransformWrapper initialScale={1} minScale={1} maxScale={4} centerOnInit>
                <TransformComponent wrapperStyle={{ width: "100%", height: "90vh" }}>
                  <img src={images[idx]} alt="품질 가이드" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white mx-auto" />
                </TransformComponent>
              </TransformWrapper>
            </div>
          </DialogContent>
        </Dialog>

        {images.length > 1 && (
          <>
            <button
              onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-90 transition-all z-10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIdx(i => (i + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-90 transition-all z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex justify-center items-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${i === idx ? 'w-4 h-2 bg-[#006341]' : 'w-2 h-2 bg-muted-foreground/30'}`}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">{idx + 1}/{images.length}</span>
        </div>
      )}
    </div>
  );
}

// ── 상품별 품질 가이드 모달 ──────────────────────────────────────────────────

function ProductGuideModal({
  product,
  year,
  month,
  onClose,
}: {
  product: string;
  year: number;
  month: number;
  onClose: () => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const { data: guides = [], isLoading } = useQualityGuidesByProduct(product, year, month);

  const images: string[] = (() => {
    if (!guides.length) return [];
    const guide = guides[0];
    const urls = (guide as any).imageUrls as string[] | null;
    if (urls && urls.length > 0) return urls;
    return guide.imageUrl ? [guide.imageUrl] : [];
  })();

  return (
    <Dialog open={true} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-primary mb-0.5">품질 가이드</p>
            <h3 className="font-black text-secondary text-lg leading-tight">{product}</h3>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              가이드 사진이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-white border border-border">
                <img
                  src={images[imgIdx]}
                  alt={`${product} 품질 가이드 ${imgIdx + 1}`}
                  className="w-full object-contain max-h-[60vh]"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-90 transition-all z-10"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setImgIdx(i => (i + 1) % images.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-90 transition-all z-10"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex justify-center items-center gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={`rounded-full transition-all ${i === imgIdx ? 'w-4 h-2 bg-[#006341]' : 'w-2 h-2 bg-muted-foreground/30'}`}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">{imgIdx + 1}/{images.length}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── 품목 카드 (표 형태 등급 선택) ────────────────────────────────────────────

function ProductCard({
  product, idx, criteria, data, onToggle, onAdjust, hasGuide, onGuideClick,
}: {
  product: string;
  idx: number;
  criteria: string[];
  data: ProductData;
  onToggle: (criterion: string, grade: string) => void;
  onAdjust: (field: 'expired' | 'moldy', delta: number) => void;
  hasGuide: boolean;
  onGuideClick: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-mono w-6 shrink-0">
          {String(idx + 1).padStart(2, '0')}
        </span>
        <span className="font-bold text-secondary text-base">{product}</span>
        {hasGuide && (
          <button
            onClick={onGuideClick}
            className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#006341]/10 text-[#006341] border border-[#006341]/30 active:scale-95 transition-all shrink-0"
          >
            가이드보기
          </button>
        )}
      </div>

      {/* 표 형태 등급 선택 */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs text-muted-foreground font-semibold py-1.5 pr-3 w-16">항목</th>
              {['A', 'B', 'C', 'E'].map(g => (
                <th key={g} className="text-center text-xs font-bold py-1.5 w-10"
                  style={{ color: g === 'A' ? '#006341' : g === 'B' ? '#2d8653' : g === 'C' ? '#b45309' : '#ef4444' }}>
                  {g}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map(criterion => (
              <tr key={criterion} className="border-t border-border/30">
                <td className="text-xs font-semibold text-secondary py-2 pr-3">{criterion}</td>
                {['A', 'B', 'C', 'E'].map(grade => {
                  const selected = data.grades[criterion] === grade;
                  return (
                    <td key={grade} className="text-center py-2">
                      <button
                        onClick={() => onToggle(criterion, grade)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-all active:scale-90 border-2"
                        style={selected ? {
                          background: grade === 'A' ? '#006341' : grade === 'B' ? '#2d8653' : grade === 'C' ? '#f59e0b' : '#ef4444',
                          borderColor: grade === 'A' ? '#006341' : grade === 'B' ? '#2d8653' : grade === 'C' ? '#f59e0b' : '#ef4444',
                        } : {
                          background: 'transparent',
                          borderColor: '#d1d5db',
                        }}
                      >
                        {selected && <span className="block w-3 h-3 rounded-full bg-white" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 진열기한경과 / 곰팡이 */}
      <div className="flex gap-4 pt-1 border-t border-border/40">
        {(['expired', 'moldy'] as const).map(field => (
          <div key={field} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">
              {field === 'expired' ? '진열기한경과' : '곰팡이'}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onAdjust(field, -1)}
                className="w-7 h-7 rounded-lg bg-muted text-muted-foreground font-bold active:scale-95 transition-all flex items-center justify-center"
              >−</button>
              <span className="w-6 text-center font-bold text-sm">{data[field]}</span>
              <button
                onClick={() => onAdjust(field, 1)}
                className="w-7 h-7 rounded-lg bg-muted text-muted-foreground font-bold active:scale-95 transition-all flex items-center justify-center"
              >+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

type Props = {
  branch: string;
  selYear: number;
  selMonth: number;
  editId?: number;
};

export function QualityBulkChecklist({ branch, selYear, selMonth, editId }: Props) {
  const { toast } = useToast();
  const createMutation = useCreateChecklist();
  const updateMutation = useUpdateChecklist();

  // 기존 점검 데이터 로드 (수정 모드)
  const { data: existingChecklist } = useQuery({
    queryKey: ['/api/checklists', editId],
    queryFn: async () => {
      const res = await fetch(`/api/checklists/${editId}`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: (editId ?? 0) > 0,
  });

  const [selectedCategory, setSelectedCategory] = useState<QualityCategory | null>(null);
  const [bulkData, setBulkData] = useState<BulkData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [guideModalProduct, setGuideModalProduct] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: validGuideProducts = [] } = useValidGuideProducts(selYear, selMonth);
  const qualityGuideSet = new Set(
    validGuideProducts.filter(g => g.guideType === 'quality').map(g => g.product)
  );

  // 품질 현장 사진 (수정 1: VM 사진 없음, 품질 사진만)
  const [qualityPhotoUrls, setQualityPhotoUrls] = useState<string[]>([]);
  const [qualityLocalPreviews, setQualityLocalPreviews] = useState<string[]>([]);
  const [qualityUploadingCount, setQualityUploadingCount] = useState(0);
  const qualityPhotoUrlsRef = useRef<string[]>([]);
  qualityPhotoUrlsRef.current = qualityPhotoUrls;
  const qualityFileInputRef = useRef<HTMLInputElement>(null);

  // 품질 특이사항 (수정 1: VM 특이사항 없음, 품질 특이사항만)
  const [qualityNotes, setQualityNotes] = useState('');

  const { data: sunsanProducts = [] } = useProducts('수산');
  const sunsanItems = sunsanProducts.map(p =>
    p.productName ? `[${p.groupName}]${p.productName}` : `[${p.groupName}]`
  );

  // 가이드 사진 fetch
  const { data: qualityGuides = [] } = useQualityGuidesByProduct(
    selectedCategory ?? '',
    selYear,
    selMonth
  );
  const guideImages: string[] = (() => {
    const guide = qualityGuides[0];
    if (!guide) return [];
    const urls = (guide as any).imageUrls as string[] | null;
    if (urls && urls.length > 0) return urls;
    return guide.imageUrl ? [guide.imageUrl] : [];
  })();

  function getItems(cat: QualityCategory): string[] {
    if (cat === '청과') return CHEONGWA_ITEMS;
    if (cat === '채소') return CHAESO_ITEMS;
    if (cat === '수산') return sunsanItems;
    return CHUKSAN_ITEMS;
  }

  function itemCount(cat: QualityCategory) {
    if (cat === '청과') return CHEONGWA_ITEMS.length;
    if (cat === '채소') return CHAESO_ITEMS.length;
    if (cat === '수산') return sunsanItems.length;
    return CHUKSAN_ITEMS.length;
  }

  function toggleGrade(product: string, criterion: string, grade: string) {
    setBulkData(prev => {
      const existing = prev[product] ?? { grades: {}, expired: 0, moldy: 0 };
      const current = existing.grades[criterion];
      return {
        ...prev,
        [product]: {
          ...existing,
          grades: { ...existing.grades, [criterion]: current === grade ? '' : grade },
        },
      };
    });
  }

  function adjustCount(product: string, field: 'expired' | 'moldy', delta: number) {
    setBulkData(prev => {
      const existing = prev[product] ?? { grades: {}, expired: 0, moldy: 0 };
      return {
        ...prev,
        [product]: { ...existing, [field]: Math.max(0, existing[field] + delta) },
      };
    });
  }

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
      let failCount = 0;
      results.forEach(r => {
        if (r.status === 'fulfilled') uploaded.push(r.value);
        else failCount++;
      });
      if (uploaded.length > 0) setQualityPhotoUrls([...qualityPhotoUrlsRef.current, ...uploaded]);
      if (failCount > 0) toast({ title: "사진 업로드 실패", description: `${failCount}개 파일을 업로드하지 못했습니다.`, variant: "destructive" });
    } catch {
      toast({ title: "사진 업로드 실패", description: "업로드 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setQualityUploadingCount(0);
    }
  };

  const removeQualityPhoto = (index: number) => {
    setQualityPhotoUrls(prev => prev.filter((_, i) => i !== index));
    setQualityLocalPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 수정 모드: 기존 데이터를 폼에 채우기
  useEffect(() => {
    if (!existingChecklist || !editId) return;
    const rawQItems = (existingChecklist as any).qualityItems as Record<string, any> | null;
    if (!rawQItems || !rawQItems.__category) return;
    const cat = rawQItems.__category as QualityCategory;
    if (!ALL_CATEGORIES.includes(cat)) return;
    const criteria = CRITERIA_MAP[cat];
    const newBulkData: BulkData = {};
    for (const [key, val] of Object.entries(rawQItems)) {
      if (key === '__category' || typeof val !== 'object' || val === null) continue;
      const d = val as Record<string, any>;
      const grades: Record<string, string> = {};
      for (const c of criteria) {
        if (d[c]) grades[c] = String(d[c]);
      }
      newBulkData[key] = {
        grades,
        expired: typeof d.__expired === 'number' ? d.__expired : 0,
        moldy: typeof d.__moldy === 'number' ? d.__moldy : 0,
      };
    }
    setSelectedCategory(cat);
    setBulkData(newBulkData);
    const existingPhotos: string[] = (existingChecklist as any).qualityPhotoUrls || [];
    setQualityPhotoUrls(existingPhotos);
    setQualityLocalPreviews(existingPhotos);
    setQualityNotes((existingChecklist as any).qualityNotes || '');
  }, [existingChecklist, editId]);

  async function handleSubmit() {
    if (!selectedCategory) return;
    setIsSubmitting(true);
    try {
      const qualityItemsPayload: Record<string, any> = { __category: selectedCategory };
      const categoryItems = getItems(selectedCategory);
      for (const product of categoryItems) {
        const data = bulkData[product];
        if (!data) continue;
        qualityItemsPayload[product] = {
          ...data.grades,
          __expired: data.expired,
          __moldy: data.moldy,
        };
      }

      if (editId) {
        await updateMutation.mutateAsync({
          id: editId,
          data: {
            qualityItems: qualityItemsPayload,
            qualityPhotoUrls: qualityPhotoUrls.length > 0 ? qualityPhotoUrls : null,
            qualityNotes: qualityNotes.trim() || null,
            photoUrl: qualityPhotoUrls[0] || null,
          } as any,
        });
        toast({ title: "수정 완료!" });
        window.history.back();
      } else {
        await createMutation.mutateAsync({
          branch,
          category: PARENT_CATEGORY[selectedCategory],
          product: selectedCategory,
          status: 'excellent',
          checklistType: 'quality',
          year: selYear,
          month: selMonth,
          qualityItems: qualityItemsPayload,
          qualityPhotoUrls: qualityPhotoUrls.length > 0 ? qualityPhotoUrls : null,
          qualityNotes: qualityNotes.trim() || null,
          photoUrl: qualityPhotoUrls[0] || null,
        } as any);
        toast({ title: "점검 완료 및 제출되었습니다!" });
        setSelectedCategory(null);
        setBulkData({});
        setQualityPhotoUrls([]);
        setQualityLocalPreviews([]);
        setQualityNotes('');
        setSearchQuery('');
      }
    } catch (err) {
      toast({ title: editId ? "수정 실패" : "제출 실패", description: String(err), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  // 수정 2: 모바일 뒤로가기 버튼 — 카테고리 선택 화면으로 복귀
  useEffect(() => {
    if (selectedCategory) {
      (window as any).__appBack = () => {
        setSelectedCategory(null);
        setBulkData({});
        setQualityPhotoUrls([]);
        setQualityLocalPreviews([]);
        setQualityNotes('');
        setSearchQuery('');
      };
    } else {
      (window as any).__appBack = null;
    }
    return () => { (window as any).__appBack = null; };
  }, [selectedCategory]);

  const items = selectedCategory ? getItems(selectedCategory) : [];
  const criteria = selectedCategory ? CRITERIA_MAP[selectedCategory] : [];

  // ── 카테고리 선택 화면 ────────────────────────────────────────────────────

  if (!selectedCategory) {
    if (editId) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      );
    }
    return (
      <div className="p-4 md:px-[50px] w-full max-w-3xl mx-auto space-y-3 pt-4">
        <div className="mb-5">
          <p className="text-xs font-bold text-primary mb-1">{selYear}년 {selMonth}월 · {branch}점 · 품질 점검</p>
          <h2 className="text-2xl font-black text-secondary">카테고리 선택</h2>
        </div>
        {ALL_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => { setSelectedCategory(cat); setSearchQuery(''); }}
            className="w-full flex items-center justify-between p-6 rounded-3xl border-2 border-border bg-white text-secondary hover:border-primary/50 shadow-sm active:scale-[0.98] transition-all"
          >
            <span className="text-3xl font-bold">{cat}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{itemCount(cat)}개</span>
              <ChevronRight className="w-6 h-6 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    );
  }

  // ── 품목 점검 화면 ────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:px-[50px] w-full max-w-3xl mx-auto space-y-3 pt-4">
      {/* 뒤로가기 — 수정 모드에서는 숨김 */}
      {!editId && (
        <button
          onClick={() => { setSelectedCategory(null); setBulkData({}); setQualityPhotoUrls([]); setQualityLocalPreviews([]); setQualityNotes(''); setSearchQuery(''); }}
          className="flex items-center gap-1 text-sm font-bold text-muted-foreground active:scale-95 transition-all py-1"
        >
          <ChevronLeft className="w-4 h-4" /> 카테고리 선택으로
        </button>
      )}

      <p className="text-xs font-bold text-primary">
        {selYear}년 {selMonth}월 · {branch}점 · {selectedCategory} 품질 점검
      </p>

      {/* 가이드 사진 슬라이드 */}
      <GuideImageSlide images={guideImages} />

      <p className="text-sm text-muted-foreground">{items.length}개 품목 · 각 항목별 등급을 선택하세요</p>

      {/* 품목 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => {
            const q = e.target.value;
            setSearchQuery(q);
            if (!q.trim()) return;
            const match = items.find(p => p.includes(q.trim()));
            if (match && cardRefs.current[match]) {
              cardRefs.current[match]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              e.target.blur();
            }
          }}
          placeholder="품목명 검색 (예: 사과)"
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* 검색 결과 없음 */}
      {searchQuery.trim() && !items.some(p => p.includes(searchQuery.trim())) && (
        <div className="text-center py-6 text-muted-foreground text-sm font-medium">
          해당 품목이 없습니다
        </div>
      )}

      {/* 품목 카드 목록 */}
      {items.map((product, idx) => (
        <div key={product} ref={el => { cardRefs.current[product] = el; }}>
          <ProductCard
            product={product}
            idx={idx}
            criteria={criteria}
            data={bulkData[product] ?? { grades: {}, expired: 0, moldy: 0 }}
            onToggle={(criterion, grade) => toggleGrade(product, criterion, grade)}
            onAdjust={(field, delta) => adjustCount(product, field, delta)}
            hasGuide={qualityGuideSet.has(product)}
            onGuideClick={() => setGuideModalProduct(product)}
          />
        </div>
      ))}

      {/* 상품 품질 가이드 모달 */}
      {guideModalProduct && (
        <ProductGuideModal
          product={guideModalProduct}
          year={selYear}
          month={selMonth}
          onClose={() => setGuideModalProduct(null)}
        />
      )}

      {/* 품질 현장 사진 업로드 (수정 1: 품질 사진만, VM 사진 없음) */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3">
        <h3 className="font-bold text-secondary">품질 현장 사진</h3>
        {qualityLocalPreviews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {qualityLocalPreviews.map((preview, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-[#006341]/40 bg-muted">
                <img src={preview} alt={`품질 사진 ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeQualityPhoto(i)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-90 transition-all z-10 text-xs font-bold"
                >✕</button>
                {i >= qualityPhotoUrls.length && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => qualityFileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-[#006341]/40 bg-[#006341]/5 active:scale-[0.98] transition-all"
        >
          {qualityUploadingCount > 0
            ? <><Loader2 className="w-5 h-5 text-[#006341] animate-spin" /><span className="font-bold text-[#006341]">업로드 중...</span></>
            : <><Camera className="w-5 h-5 text-[#006341]" /><span className="font-bold text-[#006341]">{qualityLocalPreviews.length > 0 ? '사진 추가하기' : '탭하여 사진 업로드'}</span></>
          }
        </button>
        <input ref={qualityFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleQualityFile} />
      </div>

      {/* 품질 특이사항 (수정 1: 품질 특이사항만, VM 특이사항 없음) */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-2">
        <h3 className="font-bold text-secondary">품질 특이사항 <span className="text-xs font-normal text-muted-foreground">(선택)</span></h3>
        <textarea
          value={qualityNotes}
          onChange={e => setQualityNotes(e.target.value)}
          placeholder="품질 관련 특이사항을 입력하세요..."
          className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#006341]/30"
          rows={3}
        />
      </div>

      {/* 점검 완료 및 제출 버튼 */}
      <div className="pt-2 pb-10">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl text-white font-black text-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: '#006341' }}
        >
          {isSubmitting ? (editId ? '저장 중...' : '제출 중...') : (editId ? '수정 완료 및 저장' : '점검 완료 및 제출')}
        </button>
      </div>
    </div>
  );
}
