import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateChecklist } from "@/hooks/use-checklists";
import { useProducts } from "@/hooks/use-products";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft } from "lucide-react";

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

const GRADE_ACTIVE: Record<string, string> = {
  A: 'bg-purple-600 text-white border-purple-600',
  B: 'bg-purple-400 text-white border-purple-400',
  C: 'bg-amber-400 text-white border-amber-400',
  E: 'bg-red-500 text-white border-red-500',
};

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

type Props = {
  branch: string;
  selYear: number;
  selMonth: number;
};

export function QualityBulkChecklist({ branch, selYear, selMonth }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateChecklist();

  const [selectedCategory, setSelectedCategory] = useState<QualityCategory | null>(null);
  const [bulkData, setBulkData] = useState<BulkData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: sunsanProducts = [] } = useProducts('수산');
  const sunsanItems = sunsanProducts.map(p =>
    p.productName ? `[${p.groupName}]${p.productName}` : `[${p.groupName}]`
  );

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

  async function handleSubmit() {
    if (!selectedCategory) return;
    setIsSubmitting(true);
    try {
      const qualityItemsPayload: Record<string, any> = { __category: selectedCategory };
      for (const [product, data] of Object.entries(bulkData)) {
        qualityItemsPayload[product] = {
          ...data.grades,
          __expired: data.expired,
          __moldy: data.moldy,
        };
      }

      const created = await createMutation.mutateAsync({
        branch,
        category: PARENT_CATEGORY[selectedCategory],
        product: selectedCategory,
        status: 'excellent',
        checklistType: 'quality',
        year: selYear,
        month: selMonth,
        qualityItems: qualityItemsPayload,
      } as any);

      toast({ title: "점검 완료 및 제출되었습니다!" });
      setLocation(`/checklist/edit/${created.id}`);
    } catch (err) {
      toast({ title: "제출 실패", description: String(err), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const items = selectedCategory ? getItems(selectedCategory) : [];
  const criteria = selectedCategory ? CRITERIA_MAP[selectedCategory] : [];

  // ── 카테고리 선택 화면 ────────────────────────────────────────────────────

  if (!selectedCategory) {
    return (
      <div className="p-4 md:px-[50px] w-full max-w-3xl mx-auto space-y-4 pt-4">
        <p className="text-xs font-bold text-primary">{selYear}년 {selMonth}월 · {branch}점 · 품질 점검</p>
        <p className="text-base font-bold text-secondary">카테고리를 선택하세요</p>
        <div className="space-y-3">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white border border-border shadow-sm active:scale-[0.98] transition-all text-left"
            >
              <div>
                <p className="font-bold text-base text-secondary">{cat}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{PARENT_CATEGORY[cat]}</p>
              </div>
              <span className="text-xs text-muted-foreground">{itemCount(cat)}개 품목 →</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── 품목 일괄 점검 화면 ───────────────────────────────────────────────────

  return (
    <div className="p-4 md:px-[50px] w-full max-w-3xl mx-auto space-y-3 pt-4">
      {/* 뒤로가기 */}
      <button
        onClick={() => { setSelectedCategory(null); setBulkData({}); }}
        className="flex items-center gap-1 text-sm font-bold text-muted-foreground active:scale-95 transition-all py-1"
      >
        <ChevronLeft className="w-4 h-4" /> 카테고리 선택으로
      </button>

      <p className="text-xs font-bold text-primary">
        {selYear}년 {selMonth}월 · {branch}점 · {selectedCategory} 품질 점검
      </p>
      <p className="text-sm text-muted-foreground">{items.length}개 품목 · 각 항목별 등급을 선택하세요</p>

      {/* 품목 카드 목록 */}
      {items.map((product, idx) => {
        const data = bulkData[product] ?? { grades: {}, expired: 0, moldy: 0 };
        return (
          <div
            key={product}
            className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3"
          >
            {/* 품목명 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono w-6 shrink-0">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span className="font-bold text-secondary text-base">{product}</span>
            </div>

            {/* 등급 버튼 */}
            {criteria.map(criterion => (
              <div key={criterion} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground w-14 shrink-0">{criterion}</span>
                <div className="flex gap-2">
                  {['A', 'B', 'C', 'E'].map(grade => (
                    <button
                      key={grade}
                      onClick={() => toggleGrade(product, criterion, grade)}
                      className={`w-10 h-9 rounded-xl text-sm font-black transition-all active:scale-95 border ${
                        data.grades[criterion] === grade
                          ? GRADE_ACTIVE[grade]
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* 진열기한경과 / 곰팡이 */}
            <div className="flex gap-4 pt-1 border-t border-border/40">
              {(['expired', 'moldy'] as const).map(field => (
                <div key={field} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">
                    {field === 'expired' ? '진열기한경과' : '곰팡이'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => adjustCount(product, field, -1)}
                      className="w-7 h-7 rounded-lg bg-muted text-muted-foreground font-bold active:scale-95 transition-all flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-bold text-sm">{data[field]}</span>
                    <button
                      onClick={() => adjustCount(product, field, 1)}
                      className="w-7 h-7 rounded-lg bg-muted text-muted-foreground font-bold active:scale-95 transition-all flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* 제출 버튼 */}
      <div className="pt-2 pb-10">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl text-white font-black text-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: '#006341' }}
        >
          {isSubmitting ? '제출 중...' : '점검 완료 및 제출'}
        </button>
      </div>
    </div>
  );
}
