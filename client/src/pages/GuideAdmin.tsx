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
import { useProducts, useCreateProduct, useDeleteProduct, useUpsertProductFile, useUpdateProductFiles } from "@/hooks/use-products";
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
  FileText,
  Download,
  Paperclip,
  Search,
  Tag,
  Ruler,
  MapPin as MapPinIcon,
} from "lucide-react";

const CATEGORIES = ['농산', '수산', '축산', '공산'];

// ── 품질 가이드 전용 정적 데이터 ───────────────────────────────────────────────

const QUALITY_CATEGORIES = ['청과', '채소', '수산', '축산', '공산'] as const;

const QUALITY_CHEONGWA_ITEMS = [
  '사과', '배', '딸기', '참외', '밤', '수박', '바나나', '오렌지', '키위', '블루베리',
  '수입포도', '용과', '파인애플', '아보카도', '자몽', '레몬', '망고', '감귤', '한라봉',
  '레드향', '샤인머스켓', '방울토마토', '토마토',
];

const QUALITY_CHAESO_ITEMS = [
  '콜라비', '블로컬리', '양배추', '적채', '비트', '바타비아', '샐러리', '유러피안채소',
  '샐러드', '양상추', '애호박', '오이', '파프리카', '청양고추', '풋고추', '꽈리고추',
  '오이맛고추', '홍고추', '피망', '가지', '단호박', '허브채소', '양파', '대파', '깐마늘',
  '생강', '팽이버섯', '새송이버섯', '느타리버섯', '표고버섯', '양송이버섯', '머쉬멜로버섯',
  '시금치', '미나리', '모둠쌈', '상추', '깻잎', '청경채', '열무', '얼갈이', '쪽파',
  '고구마', '감자', '당근', '연근', '무', '배추', '부추', '아스파라거스',
];

const QUALITY_CHUKSAN_ITEMS = [
  '삼겹살(냉장)', '목심(냉장)', '앞다리(냉장)', '등갈비(냉장)', '갈비찜(냉장)',
  '보쌈/수육(냉장)', '항정살(냉장)', '한우불고기(냉장)', '한우국거리(냉장)', '한우등심(냉장)',
  '한우안심(냉장)', '한우채끝(냉장)', '한우부채살(냉장)', '척아이롤_미국', '부채살_미국',
  '살치살_미국', '갈비찜용_미국', '국거리_미국', '부채살(와규)_호주', '치마살(와규)_호주',
  '삼각살(와규)_호주', '스테이크(와규)_호주', '국거리(와규)_호주', '불고기(와규)_호주',
  '갈비찜용_호주', '부채살_호주', '살치살_호주', '척아이롤_호주', '립캡(와규)_호주', '치마살_호주',
];

type GuideFormData = {
  category: string;
  product: string;
  storeType?: string | null;
  guideType: 'vm' | 'ad' | 'quality';
  points: string[];
  items: string[];
  itemWeights: Record<string, number>;
  existingImageUrls: string[];
  newImageFiles: File[];
  videoFile?: File | null;
  videoUrl?: string;
  videoLinkUrl?: string;
  existingAttachFileUrls: string[];
  newAttachFiles: File[];
  validFromYear?: number | null;
  validFromMonth?: number | null;
  validToYear?: number | null;
  validToMonth?: number | null;
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

  const getInitialAttachFileUrls = () => {
    const urls = (initial as any)?.attachFileUrls as string[] | null;
    return urls && urls.length > 0 ? urls : [];
  };

  const initialGuideType = (initial as any)?.guideType || 'vm';
  const initialCategory = (() => {
    if (initial?.category) return initial.category;
    return initialGuideType === 'quality' ? '청과' : '농산';
  })();

  const [form, setForm] = useState<GuideFormData>({
    category: initialCategory,
    product: initial?.product || '',
    storeType: initial?.storeType ?? null,
    guideType: initialGuideType,
    points: initial?.points || [''],
    items: initial?.items || [''],
    itemWeights: (initial as any)?.itemWeights || {},
    existingImageUrls: getInitialImageUrls(),
    newImageFiles: [],
    videoFile: null,
    videoUrl: (initial as any)?.videoUrl || '',
    videoLinkUrl: (initial as any)?.videoLinkUrl || '',
    existingAttachFileUrls: getInitialAttachFileUrls(),
    newAttachFiles: [],
    validFromYear: (initial as any)?.validFromYear ?? null,
    validFromMonth: (initial as any)?.validFromMonth ?? null,
    validToYear: (initial as any)?.validToYear ?? null,
    validToMonth: (initial as any)?.validToMonth ?? null,
  });
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
  const attachFileRef = useRef<HTMLInputElement>(null);

  const { data: dbProducts = [] } = useProducts(form.category);

  const groups = [...new Set(dbProducts.map(p => p.groupName))];
  const subProducts = dbProducts.filter(p => p.groupName === selectedGroup && p.productName);

  // 품질 가이드용: 대분류별 세부상품 목록 (수산/공산은 DB에서)
  const qualityProductList = (() => {
    if (form.guideType !== 'quality') return [];
    if (form.category === '청과') return QUALITY_CHEONGWA_ITEMS;
    if (form.category === '채소') return QUALITY_CHAESO_ITEMS;
    if (form.category === '축산') return QUALITY_CHUKSAN_ITEMS;
    // 수산/공산: DB 상품을 [그룹]상품 형식으로
    return dbProducts.map(p => p.productName ? `[${p.groupName}]${p.productName}` : `[${p.groupName}]`);
  })();

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

  const handleAttachFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setForm(f => ({ ...f, newAttachFiles: [...f.newAttachFiles, ...files] }));
    if (attachFileRef.current) attachFileRef.current.value = '';
  };

  const removeExistingAttachFile = (idx: number) => {
    setForm(f => ({ ...f, existingAttachFileUrls: f.existingAttachFileUrls.filter((_, i) => i !== idx) }));
  };

  const removeNewAttachFile = (idx: number) => {
    setForm(f => ({ ...f, newAttachFiles: f.newAttachFiles.filter((_, i) => i !== idx) }));
  };

  const getAttachFileName = (url: string) => {
    const sep = url.indexOf('||');
    if (sep !== -1) return url.substring(0, sep);
    return url.split('/').pop() || url;
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
      {form.guideType === 'quality' ? (
        /* ── 품질 가이드: 대분류 + 세부상품 (그룹 없음) ── */
        <>
          <div className="space-y-2">
            <label className="text-sm font-bold text-secondary">대분류</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value, product: '' }))}
              className="w-full px-4 py-3 rounded-xl border-2 border-border text-base focus:outline-none focus:border-purple-500"
              data-testid="select-guide-category"
            >
              {QUALITY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-secondary">세부상품</label>
            <select
              value={form.product}
              onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border-2 border-border text-base focus:outline-none focus:border-purple-500"
              data-testid="select-guide-product"
            >
              <option value="">상품 선택</option>
              {qualityProductList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {form.product && (
            <div className="px-4 py-2 bg-purple-50 rounded-xl text-purple-700 font-bold text-sm border border-purple-200">
              선택된 상품: <span className="font-black">{form.product}</span>
            </div>
          )}
        </>
      ) : (
        /* ── 진열/광고 가이드: 기존 대분류 + 그룹 + 세부상품 ── */
        <>
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
        </>
      )}

      <div className="space-y-2">
        <label className="text-sm font-bold text-secondary">가이드 종류</label>
        <div className="flex gap-2">
          {([['vm', '진열'], ['ad', '광고(+셀링)'], ['quality', '품질']] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => {
                if (form.guideType === val) return;
                const newCat = val === 'quality' ? '청과' : '농산';
                setForm(f => ({ ...f, guideType: val, category: newCat, product: '' }));
                setSelectedGroup('');
              }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 border-2 ${
                form.guideType === val
                  ? val === 'ad' ? 'bg-amber-500 text-white border-amber-500' : val === 'quality' ? 'bg-purple-600 text-white border-purple-600' : 'bg-primary text-white border-primary'
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

      {form.guideType === 'ad' && (
        <div className="space-y-2">
          <label className="text-sm font-bold text-secondary">광고 링크 URL <span className="text-xs text-muted-foreground font-normal">(유튜브, 외부 링크 등)</span></label>
          <div className="flex items-center gap-2 p-3 rounded-2xl border-2 border-amber-200 bg-amber-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <input
              type="url"
              placeholder="https://youtube.com/..."
              value={form.videoLinkUrl || ''}
              onChange={e => setForm(f => ({ ...f, videoLinkUrl: e.target.value }))}
              className="flex-1 bg-transparent text-sm text-amber-900 placeholder:text-amber-400 outline-none"
              data-testid="input-guide-video-link"
            />
            {form.videoLinkUrl && (
              <button type="button" onClick={() => setForm(f => ({ ...f, videoLinkUrl: '' }))} className="p-1 rounded-lg bg-amber-200 text-amber-700 hover:bg-amber-300 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {form.guideType === 'quality' && (
        <div className="space-y-2">
          <label className="text-sm font-bold text-purple-700">첨부 파일 <span className="text-xs text-muted-foreground font-normal">(JPG · PDF · Excel 등)</span></label>
          <div className="space-y-2">
            {form.existingAttachFileUrls.map((url, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 border border-purple-200">
                <FileText className="w-5 h-5 text-purple-500 shrink-0" />
                <span className="flex-1 text-sm text-purple-800 truncate">{getAttachFileName(url)}</span>
                <button type="button" onClick={() => removeExistingAttachFile(idx)} className="p-1.5 rounded-lg bg-purple-200 text-purple-700 hover:bg-purple-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {form.newAttachFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 border border-purple-200">
                <FileText className="w-5 h-5 text-purple-500 shrink-0" />
                <span className="flex-1 text-sm text-purple-800 truncate">{file.name}</span>
                <button type="button" onClick={() => removeNewAttachFile(idx)} className="p-1.5 rounded-lg bg-purple-200 text-purple-700 hover:bg-purple-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => attachFileRef.current?.click()}
            className="w-full py-5 rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-all"
            data-testid="button-guide-attach-file"
          >
            <Paperclip className="w-8 h-8 text-purple-400" />
            <span className="text-sm text-purple-600 font-medium">파일 첨부 (여러 개 가능)</span>
          </button>
          <input ref={attachFileRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls,.csv,.hwp,.pptx,.ppt,.docx,.doc" className="hidden" onChange={handleAttachFilesChange} />
        </div>
      )}

      {form.guideType !== 'quality' && (['points', 'items'] as const).map((field) => (
        <div key={field} className="space-y-3">
          <label className="text-sm font-bold text-secondary">
            {field === 'points' ? '진열 핵심 포인트'
              : form.guideType === 'quality' ? '품질 점검 아이템 (+ 환산 비율)'
              : '진열 상태 평가 항목'}
          </label>
          {/* 품질 가이드 + items 필드: 비율 합계 표시 */}
          {form.guideType === 'quality' && field === 'items' && (
            <div className="flex items-center justify-between text-xs font-bold text-purple-700 bg-purple-50 rounded-xl px-3 py-2 border border-purple-200">
              <span>비율 합계 (총 100% 기준)</span>
              <span className={`font-black text-base ${
                Math.abs(Object.values(form.itemWeights).reduce((s, v) => s + v, 0) - 100) < 0.01 ? 'text-green-600' : 'text-amber-600'
              }`}>
                {Object.values(form.itemWeights).reduce((s, v) => s + v, 0).toFixed(3)}%
              </span>
            </div>
          )}
          <div className="space-y-2">
            {form[field].map((val, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={val}
                  onChange={e => updateListItem(field, idx, e.target.value)}
                  placeholder={`항목 ${idx + 1}`}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-border text-base focus:outline-none focus:border-primary"
                  data-testid={`input-${field}-${idx}`}
                />
                {/* 품질 가이드: 비율 입력 */}
                {form.guideType === 'quality' && field === 'items' && val.trim() && (
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.001}
                      value={form.itemWeights[val] ?? ''}
                      onChange={e => {
                        const w = parseFloat(e.target.value) || 0;
                        setForm(f => ({ ...f, itemWeights: { ...f.itemWeights, [val]: w } }));
                      }}
                      placeholder="비율"
                      className="w-20 px-2 py-3 rounded-xl border-2 border-purple-300 text-sm font-bold text-center focus:outline-none focus:border-purple-500 bg-purple-50"
                      data-testid={`input-weight-${idx}`}
                    />
                    <span className="text-xs text-purple-600 font-bold">%</span>
                  </div>
                )}
                <button type="button" onClick={() => {
                  if (form.guideType === 'quality' && field === 'items' && val.trim()) {
                    setForm(f => {
                      const { [val]: _, ...rest } = f.itemWeights;
                      return { ...f, itemWeights: rest };
                    });
                  }
                  removeListItem(field, idx);
                }} className="p-3 rounded-xl bg-muted text-muted-foreground hover:text-primary transition-colors shrink-0">
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

      {/* 노출 월 설정 */}
      <div className="space-y-3 p-4 bg-blue-50 rounded-2xl border border-blue-200">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-blue-800">📅 현장직원 노출 설정</label>
        </div>
        {/* 3-way toggle */}
        <div className="flex gap-1.5">
          {([
            { mode: 'always', label: '항상 노출', color: 'bg-blue-500 text-white', inactive: 'bg-white text-blue-400 border-2 border-blue-200' },
            { mode: 'period', label: '기간 설정', color: 'bg-primary text-white', inactive: 'bg-white text-secondary border-2 border-border' },
            { mode: 'hidden', label: '노출 안함', color: 'bg-red-500 text-white', inactive: 'bg-white text-red-400 border-2 border-red-200' },
          ] as const).map(({ mode, label, color, inactive }) => {
            const currentMode = form.validFromYear == null ? 'always' : form.validFromYear === 9999 ? 'hidden' : 'period';
            const isActive = currentMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  if (mode === 'always') setForm(f => ({ ...f, validFromYear: null, validFromMonth: null, validToYear: null, validToMonth: null }));
                  else if (mode === 'period') setForm(f => ({ ...f, validFromYear: new Date().getFullYear(), validFromMonth: 1, validToYear: new Date().getFullYear(), validToMonth: 12 }));
                  else setForm(f => ({ ...f, validFromYear: 9999, validFromMonth: 1, validToYear: 9999, validToMonth: 12 }));
                }}
                className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 ${isActive ? color : inactive}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {(() => {
          const currentMode = form.validFromYear == null ? 'always' : form.validFromYear === 9999 ? 'hidden' : 'period';
          if (currentMode === 'period') return (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-blue-700">노출 시작</p>
                  <div className="flex gap-1">
                    <select
                      value={form.validFromYear ?? new Date().getFullYear()}
                      onChange={e => setForm(f => ({ ...f, validFromYear: Number(e.target.value) }))}
                      className="flex-1 px-2 py-2 rounded-lg border border-blue-200 text-sm font-bold bg-white"
                    >
                      {[2026,2027,2028,2029,2030].map(y => <option key={y} value={y}>{y}년</option>)}
                    </select>
                    <select
                      value={form.validFromMonth ?? 1}
                      onChange={e => setForm(f => ({ ...f, validFromMonth: Number(e.target.value) }))}
                      className="w-16 px-2 py-2 rounded-lg border border-blue-200 text-sm font-bold bg-white"
                    >
                      {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-blue-700">노출 종료</p>
                  <div className="flex gap-1">
                    <select
                      value={form.validToYear ?? new Date().getFullYear()}
                      onChange={e => setForm(f => ({ ...f, validToYear: Number(e.target.value) }))}
                      className="flex-1 px-2 py-2 rounded-lg border border-blue-200 text-sm font-bold bg-white"
                    >
                      {[2026,2027,2028,2029,2030].map(y => <option key={y} value={y}>{y}년</option>)}
                    </select>
                    <select
                      value={form.validToMonth ?? 12}
                      onChange={e => setForm(f => ({ ...f, validToMonth: Number(e.target.value) }))}
                      className="w-16 px-2 py-2 rounded-lg border border-blue-200 text-sm font-bold bg-white"
                    >
                      {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <p className="text-xs text-blue-600 font-medium">
                현장직원에게 <span className="font-black">{form.validFromYear}년 {form.validFromMonth}월 ~ {form.validToYear}년 {form.validToMonth}월</span> 동안만 노출됩니다.
              </p>
            </div>
          );
          if (currentMode === 'hidden') return (
            <p className="text-xs text-red-500 font-medium">현장직원에게 노출되지 않습니다.</p>
          );
          return (
            <p className="text-xs text-blue-500">기간 제한 없이 항상 현장직원에게 노출됩니다.</p>
          );
        })()}
      </div>

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

function parseFileEntry(entry: string): { name: string; url: string } {
  const idx = entry.indexOf('||');
  if (idx === -1) return { name: '파일', url: entry };
  return { name: entry.slice(0, idx), url: entry.slice(idx + 2) };
}

function ProductManager() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState('축산');
  const [showForm, setShowForm] = useState(false);

  // Group combobox
  const [groupQuery, setGroupQuery] = useState('');
  const [showGroupDrop, setShowGroupDrop] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const groupRef = useRef<HTMLDivElement>(null);

  // Product combobox
  const [productQuery, setProductQuery] = useState('');
  const [showProductDrop, setShowProductDrop] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [newProd, setNewProd] = useState({ name: '', brand: '', spec: '', displayZone: '' });
  const productRef = useRef<HTMLDivElement>(null);

  // Files
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading } = useProducts(activeCategory);
  const createMutation = useCreateProduct();
  const deleteMutation = useDeleteProduct();
  const upsertFileMutation = useUpsertProductFile();
  const updateFilesMutation = useUpdateProductFiles();

  const groups = [...new Set(products.map(p => p.groupName))];
  const effectiveGroup = isNewGroup ? newGroupName : selectedGroup;
  const groupProducts = products.filter(p => p.groupName === effectiveGroup);
  const filteredGroups = groups.filter(g => !groupQuery || g.toLowerCase().includes(groupQuery.toLowerCase()));
  const filteredGroupProducts = groupProducts.filter(p =>
    !productQuery || (p.productName ?? '').toLowerCase().includes(productQuery.toLowerCase())
  );
  const groupReady = isNewGroup ? !!newGroupName.trim() : !!selectedGroup;

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setShowGroupDrop(false);
      if (productRef.current && !productRef.current.contains(e.target as Node)) setShowProductDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const resetForm = () => {
    setGroupQuery(''); setShowGroupDrop(false); setSelectedGroup(''); setIsNewGroup(false); setNewGroupName('');
    setProductQuery(''); setShowProductDrop(false); setSelectedProduct(null); setIsNewProduct(false);
    setNewProd({ name: '', brand: '', spec: '', displayZone: '' });
    setNewFiles([]);
    setShowForm(false);
  };

  const handleAdd = async () => {
    const groupName = isNewGroup ? newGroupName.trim() : selectedGroup;
    if (!groupName) { toast({ title: "그룹을 선택해주세요", variant: "destructive" }); return; }
    let productName: string | null = null;
    let brand: string | null = null;
    let spec: string | null = null;
    let displayZone: string | null = null;
    if (isNewProduct) {
      if (!newProd.name.trim()) { toast({ title: "상품명을 입력해주세요", variant: "destructive" }); return; }
      productName = newProd.name.trim();
      brand = newProd.brand.trim() || null;
      spec = newProd.spec.trim() || null;
      displayZone = newProd.displayZone.trim() || null;
    } else {
      productName = selectedProduct;
    }
    try {
      const { uploadFile } = await import("@/lib/upload");
      if (newFiles.length > 0) {
        for (const file of newFiles) {
          const objectPath = await uploadFile(file);
          const fileEntry = `${file.name}||${objectPath}`;
          await upsertFileMutation.mutateAsync({ category: activeCategory, groupName, productName, fileUrl: fileEntry });
        }
        toast({ title: "상품 및 파일 추가 완료!" });
      } else {
        await createMutation.mutateAsync({ category: activeCategory, groupName, productName, brand, spec, displayZone } as any);
        toast({ title: "상품 추가 완료!" });
      }
      resetForm();
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

  const handleAddFile = async (productId: number, category: string, file: File) => {
    setUploadingId(productId);
    try {
      const { uploadFile } = await import("@/lib/upload");
      const objectPath = await uploadFile(file);
      const fileEntry = `${file.name}||${objectPath}`;
      const product = products.find(p => p.id === productId);
      const existing = ((product as any)?.fileUrls as string[] | null) ?? [];
      await updateFilesMutation.mutateAsync({ id: productId, fileUrls: [...existing, fileEntry], category });
      toast({ title: "파일 추가 완료!" });
    } catch {
      toast({ title: "파일 업로드 실패", variant: "destructive" });
    } finally {
      setUploadingId(null);
    }
  };

  const handleRemoveFile = async (productId: number, category: string, fileUrl: string) => {
    const product = products.find(p => p.id === productId);
    const existing = ((product as any)?.fileUrls as string[] | null) ?? [];
    const remaining = existing.filter(u => u !== fileUrl);
    try {
      await updateFilesMutation.mutateAsync({ id: productId, fileUrls: remaining, category });
    } catch {
      toast({ title: "파일 삭제 실패", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      {/* Category tabs */}
      <div className="flex gap-1.5">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); resetForm(); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
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
          className="w-full py-4 rounded-xl border-2 border-dashed border-primary/40 text-primary font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-primary/5"
          data-testid="button-add-product"
        >
          <Plus className="w-5 h-5" /> 상품 추가
        </button>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-muted/30 rounded-3xl border border-border p-5 space-y-4">
          <h3 className="font-bold text-secondary text-lg">새 상품 추가 — {activeCategory}</h3>

          {/* ── GROUP COMBOBOX ─────────────────────── */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">그룹 *</label>
            <div className="relative" ref={groupRef}>
              <button
                type="button"
                onClick={() => { setShowGroupDrop(v => !v); setGroupQuery(''); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 ${showGroupDrop ? 'border-primary' : 'border-border'} bg-white text-sm font-bold transition-colors`}
                data-testid="button-group-select"
              >
                <span className={effectiveGroup ? 'text-secondary' : 'text-muted-foreground'}>
                  {isNewGroup && newGroupName ? `새 그룹: ${newGroupName}` : selectedGroup || '그룹 선택 ▾'}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showGroupDrop ? 'rotate-180' : ''}`} />
              </button>
              {showGroupDrop && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-2xl border border-border shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-border flex items-center gap-2 px-3">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      value={groupQuery}
                      onChange={e => setGroupQuery(e.target.value)}
                      placeholder="그룹 검색..."
                      className="flex-1 text-sm py-1.5 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    {filteredGroups.map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          setSelectedGroup(g); setIsNewGroup(false); setNewGroupName('');
                          setShowGroupDrop(false); setGroupQuery('');
                          setSelectedProduct(null); setIsNewProduct(false); setProductQuery('');
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors ${selectedGroup === g && !isNewGroup ? 'text-primary font-bold bg-primary/5' : 'text-secondary'}`}
                      >
                        {g}
                      </button>
                    ))}
                    {filteredGroups.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">검색 결과 없음</p>}
                  </div>
                  <div className="border-t border-border">
                    {isNewGroup ? (
                      <div className="p-2 space-y-2">
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={e => setNewGroupName(e.target.value)}
                          placeholder="새 그룹명 입력..."
                          className="w-full px-3 py-2 rounded-lg border-2 border-primary text-sm font-bold focus:outline-none"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter' && newGroupName.trim()) setShowGroupDrop(false); }}
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setIsNewGroup(false); setNewGroupName(''); }} className="flex-1 py-1.5 rounded-lg bg-muted text-xs font-bold text-secondary">취소</button>
                          <button type="button" onClick={() => { if (newGroupName.trim()) setShowGroupDrop(false); }} className="flex-1 py-1.5 rounded-lg bg-primary text-white text-xs font-bold">확인</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setIsNewGroup(true); setSelectedGroup(''); }}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-primary flex items-center gap-2 hover:bg-primary/5 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> 새 그룹 추가
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── PRODUCT COMBOBOX ─────────────────── */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">세부 상품명 (선택)</label>
            <div className="relative" ref={productRef}>
              <button
                type="button"
                disabled={!groupReady}
                onClick={() => { if (groupReady) { setShowProductDrop(v => !v); setProductQuery(''); } }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 ${showProductDrop ? 'border-primary' : 'border-border'} ${!groupReady ? 'opacity-40 cursor-not-allowed bg-muted/30' : 'bg-white'} text-sm font-bold transition-colors`}
                data-testid="button-product-select"
              >
                <span className={isNewProduct || selectedProduct ? 'text-secondary' : 'text-muted-foreground'}>
                  {isNewProduct ? (newProd.name || '새 상품 입력 중...') : (selectedProduct || '세부 상품명 선택 ▾')}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showProductDrop ? 'rotate-180' : ''}`} />
              </button>
              {showProductDrop && groupReady && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-2xl border border-border shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-border flex items-center gap-2 px-3">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      value={productQuery}
                      onChange={e => setProductQuery(e.target.value)}
                      placeholder="상품 검색..."
                      className="flex-1 text-sm py-1.5 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    {filteredGroupProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProduct(p.productName ?? null);
                          setIsNewProduct(false);
                          setShowProductDrop(false); setProductQuery('');
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors ${selectedProduct === p.productName && !isNewProduct ? 'text-primary font-bold bg-primary/5' : 'text-secondary'}`}
                      >
                        {p.productName ?? '(단일 상품)'}
                      </button>
                    ))}
                    {filteredGroupProducts.length === 0 && (
                      <p className="px-4 py-3 text-sm text-muted-foreground">{productQuery ? '검색 결과 없음' : '이 그룹에 상품 없음'}</p>
                    )}
                  </div>
                  <div className="border-t border-border">
                    <button
                      type="button"
                      onClick={() => { setIsNewProduct(true); setSelectedProduct(null); setShowProductDrop(false); setProductQuery(''); }}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-primary flex items-center gap-2 hover:bg-primary/5 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> 새 상품 추가
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* New product inline form */}
            {isNewProduct && (
              <div className="mt-2 p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-primary">새 상품 정보</p>
                  <button type="button" onClick={() => { setIsNewProduct(false); setNewProd({ name: '', brand: '', spec: '', displayZone: '' }); }} className="text-muted-foreground hover:text-secondary">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="상품명 *"
                  value={newProd.name}
                  onChange={e => setNewProd(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-border text-sm font-bold focus:outline-none focus:border-primary bg-white"
                  data-testid="input-new-product-name"
                />
              </div>
            )}
          </div>

          {/* ── FILE UPLOAD ───────────────────────── */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">상품 파일 첨부 (선택 · JPG/PDF/Excel)</label>
            <div
              className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-border bg-white cursor-pointer hover:border-primary/60 transition-colors"
              onClick={() => addFileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground flex-1 truncate">
                {newFiles.length > 0 ? `${newFiles.length}개 파일 선택됨` : '파일을 선택하거나 여기를 눌러 첨부'}
              </span>
            </div>
            <input ref={addFileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls,.csv" className="hidden" onChange={e => setNewFiles(Array.from(e.target.files ?? []))} />
            {newFiles.length > 0 && (
              <div className="space-y-1">
                {newFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs text-secondary flex-1 truncate">{f.name}</span>
                    <button type="button" onClick={() => setNewFiles(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">이미 등록된 상품에 파일을 추가하면 해당 상품이 자동으로 업데이트됩니다.</p>
          <div className="flex gap-3">
            <button onClick={resetForm} className="flex-1 py-4 rounded-2xl bg-muted text-secondary font-bold">취소</button>
            <button
              onClick={handleAdd}
              disabled={createMutation.isPending || upsertFileMutation.isPending}
              className="flex-1 py-4 rounded-2xl bg-primary text-white font-black flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="button-save-product"
            >
              {(createMutation.isPending || upsertFileMutation.isPending) ? <Loader2 className="w-5 h-5 animate-spin" /> : "추가"}
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
                  {groupProducts.map(p => {
                    const fileEntries: string[] = (p as any).fileUrls ?? [];
                    return (
                      <div key={p.id} className="px-4 py-3 space-y-2" data-testid={`row-product-${p.id}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            {p.productName ? (
                              <span className="text-base font-bold text-secondary">{p.productName}</span>
                            ) : (
                              <span className="text-base font-bold text-muted-foreground italic">단일 상품 (그룹 = 상품)</span>
                            )}
                            {((p as any).brand || (p as any).spec || (p as any).displayZone) && (
                              <div className="flex flex-wrap gap-1.5">
                                {(p as any).brand && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                    <Tag className="w-3 h-3" />{(p as any).brand}
                                  </span>
                                )}
                                {(p as any).spec && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    <Ruler className="w-3 h-3" />{(p as any).spec}
                                  </span>
                                )}
                                {(p as any).displayZone && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <MapPinIcon className="w-3 h-3" />{(p as any).displayZone}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Add file button */}
                            <label className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer" title="파일 추가">
                              {uploadingId === p.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Paperclip className="w-4 h-4" />
                              }
                              <input
                                type="file"
                                multiple
                                accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls,.csv"
                                className="hidden"
                                onChange={e => {
                                  const files = Array.from(e.target.files ?? []);
                                  files.forEach(f => handleAddFile(p.id, activeCategory, f));
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            <button
                              onClick={() => handleDelete(p.id, p.productName || group)}
                              disabled={deleteMutation.isPending}
                              className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50"
                              data-testid={`button-delete-product-${p.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {/* File list */}
                        {fileEntries.length > 0 && (
                          <div className="space-y-1 pl-1">
                            {fileEntries.map((entry, i) => {
                              const { name, url } = parseFileEntry(entry);
                              return (
                                <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-primary/5 rounded-lg">
                                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={name}
                                    className="text-xs text-primary font-medium flex-1 truncate hover:underline"
                                    data-testid={`link-file-${p.id}-${i}`}
                                  >
                                    {name}
                                  </a>
                                  <button
                                    onClick={() => handleRemoveFile(p.id, activeCategory, entry)}
                                    className="text-muted-foreground hover:text-red-500 shrink-0"
                                    title="파일 삭제"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
  const [guideTypeFilter, setGuideTypeFilter] = useState<'vm' | 'ad' | 'quality'>('vm');
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

    // Upload new attach files in parallel (stored as "filename||objectPath")
    const uploadedAttachUrls: string[] = await Promise.all(
      (data.newAttachFiles as File[]).map(async (f: File) => {
        const objectPath = await uploadFile(f);
        return `${f.name}||${objectPath}`;
      })
    );
    const allAttachFileUrls = [...(data.existingAttachFileUrls as string[]), ...uploadedAttachUrls];

    const filteredItems: string[] = data.items.filter((i: string) => i.trim());
    // Only keep weights for items that still exist
    const filteredWeights: Record<string, number> = {};
    filteredItems.forEach((item: string) => {
      if (data.itemWeights?.[item] != null) filteredWeights[item] = data.itemWeights[item];
    });

    return {
      category: data.category,
      product: data.product,
      storeType: data.storeType || null,
      guideType: data.guideType || 'vm',
      points: data.points.filter((p: string) => p.trim()),
      items: filteredItems,
      itemWeights: Object.keys(filteredWeights).length > 0 ? filteredWeights : null,
      imageUrl: allImageUrls[0] || null,
      imageUrls: allImageUrls.length > 0 ? allImageUrls : null,
      videoUrl: videoUrl || null,
      videoLinkUrl: data.videoLinkUrl?.trim() || null,
      attachFileUrls: allAttachFileUrls.length > 0 ? allAttachFileUrls : null,
      validFromYear: data.validFromYear ?? null,
      validFromMonth: data.validFromMonth ?? null,
      validToYear: data.validToYear ?? null,
      validToMonth: data.validToMonth ?? null,
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
        <div className="px-4 md:px-[50px] pt-3 pb-3 flex items-center justify-between border-b border-border gap-3">
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
        <div className="flex gap-2 px-4 md:px-[50px] py-2.5 bg-muted/50 border-b border-border">
          <button
            onClick={() => setActiveTab('guides')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-base transition-all ${
              activeTab === 'guides' ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-muted-foreground hover:bg-white/60'
            }`}
            data-testid="tab-guides"
          >
            <BookOpen className="w-5 h-5" /> 가이드 관리
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-base transition-all ${
              activeTab === 'products' ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-muted-foreground hover:bg-white/60'
            }`}
            data-testid="tab-products"
          >
            <Package className="w-5 h-5" /> 상품 관리
          </button>
        </div>

        {/* Guide type filter — outside scroll so border spans full width */}
        {activeTab === 'guides' && (
          <div className="flex border-b border-border -mx-0 px-4 md:px-[50px] shrink-0">
            {([['vm', '진열'], ['ad', '광고(+셀링)'], ['quality', '품질']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setGuideTypeFilter(val); setShowAddForm(false); setEditingId(null); }}
                className={`flex-1 flex items-center justify-center px-2 pb-3 pt-3 text-sm transition-all whitespace-nowrap border-b-2 -mb-px ${
                  guideTypeFilter === val ? 'border-black text-black' : 'border-transparent text-muted-foreground'
                }`}
                style={{ fontWeight: guideTypeFilter === val ? 700 : 500 }}
                data-testid={`tab-guide-type-${val}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 md:px-[50px] pt-4 pb-6 space-y-4 w-full">
          {activeTab === 'products' ? (
            <ProductManager />
          ) : (
            <>
              {/* Category filter */}
              <div className="flex gap-1.5 pb-0.5">
                {['전체', ...CATEGORIES].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setGuideCategory(cat)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
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
                  className="w-full py-4 rounded-xl border-2 border-dashed border-primary/40 text-primary font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-primary/5"
                  data-testid="button-add-guide"
                >
                  <Plus className="w-5 h-5" /> 새 가이드 추가
                </button>
              )}

              {showAddForm && (
                <GuideForm
                  key={`add-${guideTypeFilter}`}
                  initial={{ guideType: guideTypeFilter }}
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
                  {guideCategory} {guideTypeFilter === 'ad' ? '광고(+셀링)' : guideTypeFilter === 'quality' ? '품질' : '진열'} 가이드가 없습니다.<br />새 가이드를 추가해주세요.
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
                              guideType: ((guide as any).guideType || 'vm') as 'vm' | 'ad' | 'quality',
                              points: guide.points as string[],
                              items: guide.items as string[],
                              itemWeights: ((guide as any).itemWeights as Record<string, number> | null) || {},
                              imageUrls: ((guide as any).imageUrls as string[] | null) || (guide.imageUrl ? [guide.imageUrl] : []),
                              videoUrl: (guide as any).videoUrl || '',
                              videoLinkUrl: (guide as any).videoLinkUrl || '',
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
                                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${(guide as any).guideType === 'ad' ? 'bg-amber-100 text-amber-700' : (guide as any).guideType === 'quality' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>
                                  {(guide as any).guideType === 'ad' ? '광고(+셀링)' : (guide as any).guideType === 'quality' ? '품질' : '진열'}
                                </span>
                                {(guide as any).videoUrl && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-700">
                                    <Video className="w-3 h-3" />영상
                                  </span>
                                )}
                                {(guide as any).videoLinkUrl && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>링크
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
                              {(guide as any).validFromYear === 9999 ? (
                                <p className="text-xs font-bold text-red-500 mt-0.5">🚫 노출 안함</p>
                              ) : (guide as any).validFromYear ? (
                                <p className="text-xs font-bold text-blue-500 mt-0.5">
                                  📅 {(guide as any).validFromYear}년 {(guide as any).validFromMonth}월 ~ {(guide as any).validToYear ?? (guide as any).validFromYear}년 {(guide as any).validToMonth ?? 12}월
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground/60 mt-0.5">항상 노출</p>
                              )}
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
                              {((guide as any).attachFileUrls as string[] | null)?.filter(Boolean).map((entry, i) => {
                                const sep = entry.indexOf('||');
                                const name = sep !== -1 ? entry.substring(0, sep) : entry.split('/').pop() || entry;
                                const url = sep !== -1 ? entry.substring(sep + 2) : entry;
                                return (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" download={name}
                                    className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 mt-1">
                                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{name}</span>
                                  </a>
                                );
                              })}
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
