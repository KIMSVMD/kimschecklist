import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Layout } from "@/components/Layout";
import { useChecklist, useUpdateChecklist, useSaveChecklistComment, useConfirmChecklistComment, useSaveChecklistReply } from "@/hooks/use-checklists";
import { useGuideByProduct, useAdminStatus, useAdGuidesByProduct, useQualityGuidesByProduct } from "@/hooks/use-guides";
import { motion } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  XOctagon,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Save,
  LayoutDashboard,
  MessageSquare,
  Send,
  CheckCheck,
  CornerDownRight,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

export default function EditChecklist() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: checklist, isLoading: checklistLoading } = useChecklist(id);
  const { data: dbGuide } = useGuideByProduct(checklist?.product || "");
  const { data: adGuides = [] } = useAdGuidesByProduct(checklist?.product || "");
  const { data: qualityGuides = [] } = useQualityGuidesByProduct(checklist?.product || "");
  const { data: adminStatus } = useAdminStatus();
  const updateMutation = useUpdateChecklist();
  const saveCommentMutation = useSaveChecklistComment();
  const confirmMutation = useConfirmChecklistComment();
  const replyMutation = useSaveChecklistReply();

  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [items, setItems] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [commentOpen, setCommentOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [adItems, setAdItems] = useState<Record<string, string>>({});
  const [adPhotoUrls, setAdPhotoUrls] = useState<string[]>([]);
  const [adLocalPreviews, setAdLocalPreviews] = useState<string[]>([]);
  const [adUploadingCount, setAdUploadingCount] = useState(0);
  const [adNotes, setAdNotes] = useState('');
  const [qualityItems, setQualityItems] = useState<Record<string, any>>({});
  const [qualityExpired, setQualityExpired] = useState<number>(0);
  const [qualityMoldy, setQualityMoldy] = useState<number>(0);
  const [qualityPhotoUrls, setQualityPhotoUrls] = useState<string[]>([]);
  const [qualityLocalPreviews, setQualityLocalPreviews] = useState<string[]>([]);
  const [qualityUploadingCount, setQualityUploadingCount] = useState(0);
  const [qualityNotes, setQualityNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoUrlsRef = useRef<string[]>([]);
  photoUrlsRef.current = photoUrls;
  const adFileInputRef = useRef<HTMLInputElement>(null);
  const adPhotoUrlsRef = useRef<string[]>([]);
  adPhotoUrlsRef.current = adPhotoUrls;
  const qualityFileInputRef = useRef<HTMLInputElement>(null);
  const qualityPhotoUrlsRef = useRef<string[]>([]);
  qualityPhotoUrlsRef.current = qualityPhotoUrls;

  const isAdmin = !!adminStatus?.isAdmin;
  const adminComment = (checklist as any)?.adminComment as string | null | undefined;
  const commentConfirmed = (checklist as any)?.commentConfirmed as boolean | null | undefined;

  const handleSaveComment = async () => {
    try {
      await saveCommentMutation.mutateAsync({ id, adminComment: commentText });
      toast({ title: "코멘트 저장됨", description: "현장 직원에게 전달됩니다." });
      setCommentOpen(false);
    } catch {
      toast({ title: "저장 실패", variant: "destructive" });
    }
  };

  const handleConfirmComment = async () => {
    try {
      await confirmMutation.mutateAsync(id);
      toast({ title: "확인 완료!", description: "관리자 코멘트를 확인했습니다." });
    } catch {
      toast({ title: "처리 실패", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (checklist) {
      const existing: string[] = (checklist as any).photoUrls || (checklist.photoUrl ? [checklist.photoUrl] : []);
      setPhotoUrls(existing);
      setLocalPreviews(existing);
      setItems((checklist.items as Record<string, string>) || {});
      setNotes(checklist.notes || "");
      setCommentText((checklist as any).adminComment || "");
      setReplyText((checklist as any).staffReply || "");
      const existingAdPhotos: string[] = (checklist as any).adPhotoUrls || [];
      setAdPhotoUrls(existingAdPhotos);
      setAdLocalPreviews(existingAdPhotos);
      setAdItems((checklist as any).adItems || {});
      setAdNotes((checklist as any).adNotes || '');
      const existingQualityPhotos: string[] = (checklist as any).qualityPhotoUrls || [];
      setQualityPhotoUrls(existingQualityPhotos);
      setQualityLocalPreviews(existingQualityPhotos);
      const rawQualityItems = (checklist as any).qualityItems || {};
      setQualityExpired(typeof rawQualityItems.__expired === 'number' ? rawQualityItems.__expired : 0);
      setQualityMoldy(typeof rawQualityItems.__moldy === 'number' ? rawQualityItems.__moldy : 0);
      const { __expired: _e, __moldy: _m, ...cleanedQualityItems } = rawQualityItems;
      setQualityItems(cleanedQualityItems);
      setQualityNotes((checklist as any).qualityNotes || '');
    }
  }, [checklist]);

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

  const adGuide = adGuides[0] ?? null;
  const adGuideItems: string[] = (adGuide?.items as string[])?.filter(Boolean) || [];
  const adGuidePoints: string[] = (adGuide?.points as string[]) || [];

  const qualityGuide = qualityGuides[0] ?? null;
  const qualityGuideItems: string[] = (qualityGuide?.items as string[])?.filter(Boolean) || [];
  const qualityGuidePoints: string[] = (qualityGuide?.points as string[]) || [];

  const checklistType = (checklist as any)?.checklistType || 'vm';

  const handleSubmit = async () => {
    if (!checklist) return;
    const hasNotok = Object.values(items).includes("notok") || Object.values(items).includes("poor");
    const finalStatus = hasNotok ? "poor" : "excellent";
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          status: finalStatus,
          photoUrl: photoUrls[0] || null,
          photoUrls: photoUrls.length > 0 ? photoUrls : null,
          notes: notes || null,
          items,
          ...(adGuide && {
            adPhotoUrls: adPhotoUrls.length > 0 ? adPhotoUrls : null,
            adNotes: adNotes || null,
            ...(adGuideItems.length > 0 && {
              adItems: Object.keys(adItems).length > 0 ? adItems : null,
            }),
          }),
          ...(checklistType === 'quality' && {
            qualityPhotoUrls: qualityPhotoUrls.length > 0 ? qualityPhotoUrls : null,
            qualityNotes: qualityNotes || null,
            ...(qualityGuideItems.length > 0 && {
              qualityItems: Object.keys(qualityItems).length > 0
                ? { ...qualityItems, __expired: qualityExpired, __moldy: qualityMoldy }
                : null,
            }),
          }),
        } as any,
      });
      setLastSaved(new Date());
      toast({ title: "저장 완료!", description: "계속 수정하거나 대시보드로 이동하세요." });
    } catch (err) {
      toast({ title: "저장 실패", description: String(err), variant: "destructive" });
    }
  };

  if (checklistLoading) {
    return (
      <Layout title="점검 수정하기" showBack={true}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!checklist) {
    return (
      <Layout title="점검 수정하기" showBack={true}>
        <div className="flex items-center justify-center h-full text-muted-foreground text-lg">
          점검 기록을 찾을 수 없습니다.
        </div>
      </Layout>
    );
  }

  const guideImage = dbGuide?.imageUrl || null;
  const guidePoints: string[] = (dbGuide?.points as string[]) || [];
  const guideItems: string[] = (dbGuide?.items as string[])?.filter(Boolean) || [];
  const allItemsEvaluated = guideItems.length === 0 || guideItems.every((item) => items[item]);

  return (
    <Layout title="점검 수정" showBack={true}>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-10">
        {/* Branch / Product info (read-only) */}
        <div className="bg-secondary text-white rounded-3xl p-5 flex items-center gap-4 shadow-lg">
          <div className="bg-white/10 p-3 rounded-2xl">
            <MapPin className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-white/70 text-sm font-medium">점검 지점 · 상품</p>
            <h2 className="text-2xl font-black leading-tight">
              {checklist.branch}점 <span className="font-normal text-white/80">|</span>{" "}
              <span className="text-primary">{checklist.product}</span>
            </h2>
          </div>
        </div>

        {/* Guide Section */}
        {dbGuide && (
          <div className="space-y-4">
            <div className="bg-secondary text-white rounded-3xl p-4 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="text-primary w-6 h-6" />
                <h3 className="text-xl font-bold">진열 가이드</h3>
              </div>
              {guideImage && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="w-full rounded-2xl overflow-hidden aspect-video bg-muted/20 border border-white/10 relative group active:scale-[0.98] transition-all">
                      <img src={guideImage} alt="Guide" className="w-full h-full object-contain bg-white" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white/90 text-secondary px-4 py-2 rounded-full font-bold text-sm shadow-lg">클릭하여 확대</span>
                      </div>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] w-full p-0 border-none bg-transparent shadow-none">
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <TransformWrapper initialScale={1} minScale={1} maxScale={4} centerOnInit={true}>
                        <TransformComponent wrapperStyle={{ width: "100%", height: "90vh" }}>
                          <img src={guideImage} alt="Guide Full" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white mx-auto" />
                        </TransformComponent>
                      </TransformWrapper>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {guidePoints.length > 0 && (
              <div className="bg-muted/50 rounded-3xl border border-border p-5 space-y-3">
                <h4 className="text-lg font-bold text-secondary flex items-center gap-2">
                  <div className="w-2 h-6 bg-primary rounded-full" />
                  진열 핵심 포인트
                </h4>
                <div className="space-y-2">
                  {guidePoints.map((point, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-border/50 shadow-sm">
                      <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">{i + 1}</div>
                      <p className="text-base font-medium text-secondary leading-tight">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Photo Upload */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-secondary">현장 사진</h3>
            {localPreviews.length > 0 && (
              <span className="text-sm font-bold text-muted-foreground">{localPreviews.length}장</span>
            )}
          </div>

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
        </div>

        {/* Per-item Status */}
        {guideItems.length > 0 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-secondary">항목별 가이드 일치 여부</h3>
              <p className="text-sm text-muted-foreground">진열 가이드와 일치하면 ○, 다르면 ✗를 선택하세요.</p>
            </div>
            {guideItems.map((item) => {
              const currentVal = items[item];
              const isOk = currentVal === 'ok' || currentVal === 'excellent';
              const isNotok = currentVal === 'notok' || currentVal === 'poor';
              return (
                <div key={item} className={`rounded-2xl border-2 overflow-hidden transition-all ${
                  isOk ? 'border-blue-300 bg-blue-50' : isNotok ? 'border-primary bg-red-50' : 'border-border bg-white'
                }`}>
                  <div className="flex items-center justify-between p-4">
                    <h4 className="text-base font-bold text-secondary flex-1 pr-3">{item}</h4>
                    <div className="flex gap-3 shrink-0">
                      <button
                        onClick={() => setItems(prev => ({ ...prev, [item]: 'ok' }))}
                        className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${
                          isOk ? 'bg-blue-500 border-blue-600 text-white shadow-md' : 'bg-white border-border text-muted-foreground'
                        }`}
                        data-testid={`btn-item-ok-${item}`}
                      >
                        <CheckCircle2 className="w-8 h-8" />
                      </button>
                      <button
                        onClick={() => setItems(prev => ({ ...prev, [item]: 'notok' }))}
                        className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${
                          isNotok ? 'bg-primary border-red-700 text-white shadow-md' : 'bg-white border-border text-muted-foreground'
                        }`}
                        data-testid={`btn-item-notok-${item}`}
                      >
                        <XOctagon className="w-8 h-8" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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

        {/* Ad Inspection Section */}
        {adGuide && (
          <div className="space-y-5 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <div className="px-4 py-2 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center gap-2">
                <span className="text-lg">📢</span>
                <span className="font-black text-amber-700 text-base">광고 점검</span>
              </div>
              <div className="flex-1 h-px bg-border" />
            </div>

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
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] w-full p-0 border-none bg-transparent shadow-none">
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <TransformWrapper initialScale={1} minScale={1} maxScale={4} centerOnInit={true}>
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
                        data-testid={`btn-remove-ad-photo-edit-${i}`}
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
                data-testid="btn-add-ad-photo-edit"
              >
                {adUploadingCount > 0
                  ? <><Loader2 className="w-7 h-7 text-amber-500 animate-spin" /><span className="font-bold text-amber-600 text-lg">업로드 중...</span></>
                  : <><Camera className="w-7 h-7 text-amber-500" /><span className="font-bold text-amber-600 text-lg">{adLocalPreviews.length > 0 ? '광고 사진 추가' : '광고 사진 업로드'}</span></>
                }
              </button>
              <input ref={adFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAdFile} />
            </div>

            {adGuideItems.length > 0 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-secondary">광고 항목 점검</h3>
                  <p className="text-sm text-muted-foreground">광고 가이드와 일치하면 ○, 다르면 ✗를 선택하세요.</p>
                </div>
                {adGuideItems.map((item) => {
                  const isOk = adItems[item] === 'ok';
                  const isNotok = adItems[item] === 'notok';
                  return (
                    <div key={item} className={`rounded-2xl border-2 overflow-hidden transition-all ${
                      isOk ? 'border-amber-300 bg-amber-50' : isNotok ? 'border-primary bg-red-50' : 'border-border bg-white'
                    }`}>
                      <div className="flex items-center justify-between p-4">
                        <h4 className="text-base font-bold text-secondary flex-1 pr-3">{item}</h4>
                        <div className="flex gap-3 shrink-0">
                          <button
                            onClick={() => setAdItems(prev => ({ ...prev, [item]: 'ok' }))}
                            className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${
                              isOk ? 'bg-amber-500 border-amber-600 text-white shadow-md' : 'bg-white border-border text-muted-foreground'
                            }`}
                            data-testid={`btn-ad-item-ok-edit-${item}`}
                          >
                            <CheckCircle2 className="w-8 h-8" />
                          </button>
                          <button
                            onClick={() => setAdItems(prev => ({ ...prev, [item]: 'notok' }))}
                            className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${
                              isNotok ? 'bg-primary border-red-700 text-white shadow-md' : 'bg-white border-border text-muted-foreground'
                            }`}
                            data-testid={`btn-ad-item-notok-edit-${item}`}
                          >
                            <XOctagon className="w-8 h-8" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-xl font-bold text-amber-700">광고 특이사항 (선택)</h3>
              <textarea
                placeholder="광고물 훼손/누락/요청사항 등..."
                className="w-full p-5 rounded-2xl border-2 border-amber-200 bg-amber-50/50 text-lg focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-200/40 transition-all min-h-[7rem] resize-none"
                value={adNotes}
                onChange={(e) => setAdNotes(e.target.value)}
                data-testid="textarea-ad-notes"
              />
            </div>
          </div>
        )}

        {/* Quality Inspection Section */}
        {checklistType === 'quality' && (
          <div className="space-y-5 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <div className="px-4 py-2 bg-purple-50 border-2 border-purple-200 rounded-2xl flex items-center gap-2">
                <span className="text-lg">⭐</span>
                <span className="font-black text-purple-700 text-base">품질 점검</span>
              </div>
              <div className="flex-1 h-px bg-border" />
            </div>

            {qualityGuide?.imageUrl && (
              <div className="bg-purple-900 text-white rounded-3xl p-4 shadow-xl space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="text-purple-300 w-6 h-6" />
                  <h3 className="text-xl font-bold">품질 가이드</h3>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="w-full rounded-2xl overflow-hidden aspect-video bg-muted/20 border border-white/10 relative group active:scale-[0.98] transition-all">
                      <img src={qualityGuide.imageUrl} alt="Quality Guide" className="w-full h-full object-contain bg-white" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] w-full p-0 border-none bg-transparent shadow-none">
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <TransformWrapper initialScale={1} minScale={1} maxScale={4} centerOnInit={true}>
                        <TransformComponent wrapperStyle={{ width: "100%", height: "90vh" }}>
                          <img src={qualityGuide.imageUrl} alt="Quality Guide Full" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white mx-auto" />
                        </TransformComponent>
                      </TransformWrapper>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {qualityGuidePoints.length > 0 && (
              <div className="bg-purple-50 rounded-3xl border border-purple-200 p-5 space-y-3">
                <h4 className="text-lg font-bold text-purple-800 flex items-center gap-2">
                  <div className="w-2 h-6 bg-purple-500 rounded-full" />품질 핵심 포인트
                </h4>
                <div className="space-y-2">
                  {qualityGuidePoints.map((point, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-purple-200/50 shadow-sm">
                      <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">{i+1}</div>
                      <p className="text-base font-medium text-secondary leading-tight">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-secondary">품질 현장 사진</h3>
                {qualityLocalPreviews.length > 0 && <span className="text-sm font-bold text-muted-foreground">{qualityLocalPreviews.length}장</span>}
              </div>
              {qualityLocalPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {qualityLocalPreviews.map((preview, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-purple-200 bg-muted">
                      <img src={preview} alt={`품질 사진 ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeQualityPhoto(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-90 transition-all"
                        data-testid={`btn-remove-quality-photo-edit-${i}`}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      {i >= qualityPhotoUrls.length && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => qualityFileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl border-4 border-dashed border-purple-300 bg-purple-50 active:scale-[0.98] transition-all"
                data-testid="btn-add-quality-photo-edit"
              >
                {qualityUploadingCount > 0
                  ? <><Loader2 className="w-7 h-7 text-purple-500 animate-spin" /><span className="font-bold text-purple-600 text-lg">업로드 중...</span></>
                  : <><Camera className="w-7 h-7 text-purple-500" /><span className="font-bold text-purple-600 text-lg">{qualityLocalPreviews.length > 0 ? '품질 사진 추가' : '품질 사진 업로드'}</span></>
                }
              </button>
              <input ref={qualityFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleQualityFile} />
            </div>

            {qualityGuideItems.length > 0 && (
              <div className="space-y-4">
                {(() => {
                  const GRADE_PTS: Record<string, number> = { A: 100, B: 85, C: 70, E: 0 };
                  const CRIT_PFXS = ['선도', '상해', '규격', '혼입율', '형상'];
                  const CRIT_ORDER = ['선도', '상해', '규격', '혼입율', '형상'];
                  const parseCrit = (t: string) => CRIT_PFXS.find(c => t === c || t.startsWith(c + ':') || t.startsWith(c + ' ')) ?? null;
                  const sortedItems = [...qualityGuideItems].sort((a, b) => {
                    const ai = CRIT_ORDER.findIndex(c => a === c || a.startsWith(c + ':') || a.startsWith(c + ' '));
                    const bi = CRIT_ORDER.findIndex(c => b === c || b.startsWith(c + ':') || b.startsWith(c + ' '));
                    return (ai === -1 ? CRIT_ORDER.length : ai) - (bi === -1 ? CRIT_ORDER.length : bi);
                  });
                  const gradeScore = (g?: string) => GRADE_PTS[g || ''] ?? 0;
                  const gradeColorEdit = (g: string) => g === 'A' ? 'bg-purple-600 border-purple-700 text-white' : g === 'B' ? 'bg-purple-400 border-purple-500 text-white' : g === 'C' ? 'bg-amber-400 border-amber-500 text-white' : 'bg-red-500 border-red-600 text-white';
                  const gradeChipColor = (g: string) => g === 'A' ? 'bg-purple-600 text-white' : g === 'B' ? 'bg-purple-400 text-white' : g === 'C' ? 'bg-amber-400 text-white' : 'bg-red-500 text-white';

                  /* Format detection: new format has { grade, note } per item */
                  const firstVal = Object.values(qualityItems)[0];
                  const isNewFmt = firstVal !== undefined && typeof firstVal === 'object' && ('grade' in (firstVal as object) || 'note' in (firstVal as object));
                  const isOldCritFmt = firstVal !== undefined && typeof firstVal === 'object' && '선도' in (firstVal as object);

                  /* Overall score for new format — simple average of all graded criteria */
                  const gradedItems = qualityGuideItems.filter(i => (qualityItems[i] as any)?.grade && (qualityItems[i] as any)?.grade !== '');
                  const base = gradedItems.length > 0 ? gradedItems.reduce((s, i) => s + gradeScore((qualityItems[i] as any)?.grade), 0) / gradedItems.length : 0;
                  const overallScore = gradedItems.length > 0 ? Math.max(0, Math.round(base) - qualityExpired * 2 - qualityMoldy * 5) : null;
                  const getGrade = (s: number) => s >= 90 ? 'A' : s >= 70 ? 'B' : s >= 50 ? 'C' : 'E';

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-secondary">품질 항목 점검</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">각 항목의 등급을 선택하세요 (A/B/C/E)</p>
                        </div>
                        {overallScore !== null && (
                          <div className="text-right flex items-center gap-2">
                            <span className={`text-xl font-black px-3 py-1 rounded-full ${gradeChipColor(getGrade(overallScore))}`}>{getGrade(overallScore)}등급</span>
                            <div>
                              <div className="text-2xl font-black text-purple-600">{overallScore}점</div>
                              <div className="text-xs text-muted-foreground">매장 점수</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* New format: one grade card per guide item (선도→형상→규격→혼입율 순) */}
                      {sortedItems.map((item, idx) => {
                        const d = (qualityItems[item] as any) || {};
                        const selectedGrade: string | undefined = isNewFmt ? d.grade : isOldCritFmt ? undefined : (typeof qualityItems[item] === 'string' ? undefined : undefined);
                        const noteVal: string | undefined = isNewFmt ? d.note : undefined;
                        const criterion = parseCrit(item);
                        const itemScoreV = selectedGrade ? gradeScore(selectedGrade) : null;

                        if (!isNewFmt && !isOldCritFmt && typeof qualityItems[item] === 'string') {
                          /* Legacy ok/notok format */
                          const isOk = qualityItems[item] === 'ok';
                          const isNotok = qualityItems[item] === 'notok';
                          return (
                            <div key={item} className={`rounded-2xl border-2 overflow-hidden transition-all ${isOk ? 'border-purple-300 bg-purple-50' : isNotok ? 'border-primary bg-red-50' : 'border-border bg-white'}`}>
                              <div className="flex items-center justify-between p-4">
                                <h4 className="text-base font-bold text-secondary flex-1 pr-3">{item}</h4>
                                <div className="flex gap-3 shrink-0">
                                  <button onClick={() => setQualityItems(prev => ({ ...prev, [item]: 'ok' }))} className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${isOk ? 'bg-purple-500 border-purple-600 text-white shadow-md' : 'bg-white border-border text-muted-foreground'}`} data-testid={`btn-quality-item-ok-edit-${idx}`}><CheckCircle2 className="w-8 h-8" /></button>
                                  <button onClick={() => setQualityItems(prev => ({ ...prev, [item]: 'notok' }))} className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${isNotok ? 'bg-primary border-red-700 text-white shadow-md' : 'bg-white border-border text-muted-foreground'}`} data-testid={`btn-quality-item-notok-edit-${idx}`}><XOctagon className="w-8 h-8" /></button>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        /* New or upgraded format: single grade per item */
                        const actualGrade = isOldCritFmt ? (d['선도'] || d['상해'] || d['규격'] || d['혼입율']) : selectedGrade;
                        const actualNote = isOldCritFmt ? (d['선도_note'] || d['상해_note'] || '') : (noteVal || '');
                        return (
                          <div key={item} className={`rounded-2xl border-2 p-4 space-y-3 transition-all ${
                            actualGrade
                              ? (gradeScore(actualGrade) >= 85 ? 'border-purple-300 bg-purple-50' : gradeScore(actualGrade) >= 70 ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50')
                              : 'border-border bg-white'
                          }`}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-bold text-secondary leading-snug flex-1">{item}</p>
                              {actualGrade && itemScoreV !== null && (
                                <span className={`text-sm font-black px-2.5 py-1 rounded-full shrink-0 ${gradeChipColor(actualGrade)}`}>{itemScoreV}점</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {criterion && <span className="text-xs font-black text-white bg-secondary px-2.5 py-0.5 rounded-full">{criterion}</span>}
                              {actualGrade && <span className={`text-xs font-black px-2 py-0.5 rounded-full ${gradeChipColor(actualGrade)}`}>{actualGrade}등급</span>}
                            </div>
                            <textarea
                              rows={2}
                              placeholder={`${criterion ?? item} 상태를 입력하세요`}
                              value={actualNote}
                              onChange={e => setQualityItems(prev => ({ ...prev, [item]: { ...d, grade: actualGrade, note: e.target.value } }))}
                              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-purple-400 bg-gray-50 resize-none"
                              data-testid={`input-quality-edit-note-${idx}`}
                            />
                            <div className="flex gap-2">
                              {(['A','B','C','E'] as const).map(grade => (
                                <button
                                  key={grade}
                                  onClick={() => setQualityItems(prev => ({ ...prev, [item]: { note: actualNote, grade: actualGrade === grade ? undefined : grade } }))}
                                  className={`flex-1 h-11 rounded-xl border-2 font-black text-base transition-all active:scale-95 ${actualGrade === grade ? gradeColorEdit(grade) : 'bg-white border-border text-muted-foreground hover:border-primary/40'}`}
                                  data-testid={`btn-quality-edit-grade-${idx}-${grade}`}
                                >{grade}</button>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* 감점 항목 */}
                      <div className="space-y-2 pt-1 border-t border-border/50">
                        <p className="text-xs font-bold text-muted-foreground px-1">감점 항목</p>
                        <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white bg-orange-500 px-2.5 py-0.5 rounded-full">진열기한 경과</span>
                            <span className="text-[10px] text-orange-600 font-bold">× -2점/개</span>
                          </div>
                          <input type="number" min={0} value={qualityExpired || ''} onChange={e => setQualityExpired(Math.max(0, parseInt(e.target.value)||0))} placeholder="0개" className="w-full px-3 py-2 rounded-xl border border-orange-200 text-sm font-bold text-center focus:outline-none focus:border-orange-400 bg-white" data-testid="input-edit-expired" />
                        </div>
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white bg-red-500 px-2.5 py-0.5 rounded-full">곰팡이</span>
                            <span className="text-[10px] text-red-600 font-bold">× -5점/개</span>
                          </div>
                          <input type="number" min={0} value={qualityMoldy || ''} onChange={e => setQualityMoldy(Math.max(0, parseInt(e.target.value)||0))} placeholder="0개" className="w-full px-3 py-2 rounded-xl border border-red-200 text-sm font-bold text-center focus:outline-none focus:border-red-400 bg-white" data-testid="input-edit-moldy" />
                        </div>
                      </div>

                      {/* 진행 현황 */}
                      <div className="flex justify-between text-sm font-medium text-muted-foreground bg-muted/40 rounded-2xl px-4 py-3">
                        <span>{qualityGuideItems.filter(i => (qualityItems[i] as any)?.grade).length} / {qualityGuideItems.length} 완료</span>
                        {overallScore !== null && (
                          <span className="font-bold text-purple-600">{overallScore}점 ({getGrade(overallScore)}등급)</span>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-xl font-bold text-purple-700">품질 특이사항 (선택)</h3>
              <textarea
                placeholder="품질 관련 특이사항을 입력하세요..."
                className="w-full p-5 rounded-2xl border-2 border-purple-200 bg-purple-50/50 text-lg focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-200/40 transition-all min-h-[7rem] resize-none"
                value={qualityNotes}
                onChange={(e) => setQualityNotes(e.target.value)}
                data-testid="textarea-quality-notes-edit"
              />
            </div>
          </div>
        )}

        {/* Admin comment section */}
        {isAdmin ? (
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-secondary flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> 관리자 코멘트
            </h3>
            {!commentOpen ? (
              <button
                onClick={() => setCommentOpen(true)}
                className={`w-full flex items-center justify-between py-3 px-4 rounded-2xl border-2 text-base font-bold transition-all active:scale-[0.98] ${
                  adminComment
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-border bg-muted text-muted-foreground hover:text-secondary'
                }`}
                data-testid={`btn-comment-open-${id}`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="truncate">{adminComment || '현장 직원에게 피드백 남기기'}</span>
                </div>
                {commentConfirmed && <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0" />}
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="현장 직원에게 전달할 피드백을 입력하세요..."
                  className="w-full rounded-2xl border-2 border-border bg-white p-4 text-base text-secondary resize-none focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all min-h-[7rem]"
                  autoFocus
                  data-testid={`input-comment-${id}`}
                />
                {commentConfirmed && (
                  <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 px-1">
                    <CheckCheck className="w-3.5 h-3.5" /> 현장 직원이 이미 확인했습니다
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveComment}
                    disabled={saveCommentMutation.isPending}
                    className="flex-1 py-3 rounded-2xl bg-primary text-white font-black text-base flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                    data-testid={`btn-comment-save-${id}`}
                  >
                    {saveCommentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    저장
                  </button>
                  <button onClick={() => setCommentOpen(false)} className="px-5 py-3 rounded-2xl bg-muted text-muted-foreground font-bold active:scale-[0.98]">
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : adminComment ? (
          <div className={`rounded-2xl border-2 overflow-hidden ${commentConfirmed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              <MessageSquare className={`w-4 h-4 ${commentConfirmed ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span className={`text-xs font-black uppercase tracking-wide ${commentConfirmed ? 'text-emerald-600' : 'text-amber-600'}`}>
                관리자 코멘트
              </span>
              {commentConfirmed && (
                <span className="ml-auto text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" /> 확인완료
                </span>
              )}
            </div>
            <p className="px-4 pb-3 text-secondary text-base font-medium leading-relaxed">{adminComment}</p>
            {!commentConfirmed && (
              <div className="px-4 pb-3">
                <button
                  onClick={handleConfirmComment}
                  disabled={confirmMutation.isPending}
                  className="w-full py-4 rounded-xl bg-amber-500 text-white font-black text-lg flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                  data-testid={`btn-confirm-comment-${id}`}
                >
                  {confirmMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCheck className="w-5 h-5" />}
                  확인했습니다
                </button>
              </div>
            )}

            {commentConfirmed && (
              <div className="px-4 pb-4 border-t border-emerald-200 pt-3">
                {(checklist as any)?.staffReply && !replyOpen ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-secondary/60">
                      <CornerDownRight className="w-3.5 h-3.5" /> 내 답글
                    </div>
                    <p className="text-sm text-secondary bg-white rounded-xl px-3 py-2.5 border border-emerald-200">{(checklist as any).staffReply}</p>
                    <button onClick={() => { setReplyText((checklist as any).staffReply || ""); setReplyOpen(true); }} className="text-xs font-bold text-emerald-600 underline underline-offset-2">수정하기</button>
                  </div>
                ) : replyOpen ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-secondary/60">
                      <CornerDownRight className="w-3.5 h-3.5" /> 답글 작성
                    </div>
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="관리자 코멘트에 답글을 남기세요..."
                      className="w-full rounded-xl border border-emerald-300 bg-white p-3 text-base text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400/40 min-h-[5rem]"
                      data-testid={`textarea-reply-edit-${id}`}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await replyMutation.mutateAsync({ id, staffReply: replyText });
                            toast({ title: "답글이 전송됐습니다" });
                            setReplyOpen(false);
                          } catch {
                            toast({ title: "전송 실패", variant: "destructive" });
                          }
                        }}
                        disabled={replyMutation.isPending || !replyText.trim()}
                        className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-black text-base flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                        data-testid={`btn-send-reply-edit-${id}`}
                      >
                        {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        전송
                      </button>
                      <button onClick={() => setReplyOpen(false)} className="px-4 py-3 rounded-xl bg-muted text-muted-foreground font-bold active:scale-[0.98]">취소</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setReplyOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-600 font-bold text-base hover:bg-emerald-100 active:scale-[0.98] transition-all"
                    data-testid={`btn-open-reply-edit-${id}`}
                  >
                    <CornerDownRight className="w-4 h-4" /> 답글 남기기
                  </button>
                )}
              </div>
            )}
          </div>
        ) : null}

        {lastSaved && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-green-50 border border-green-200"
          >
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <span className="text-green-700 font-bold text-base">
              저장 완료 — {lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </motion.div>
        )}

        {guideItems.length > 0 && !allItemsEvaluated && (
          <p className="text-center text-sm text-muted-foreground">모든 평가 항목을 선택해주세요</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={updateMutation.isPending || uploadingCount > 0 || !allItemsEvaluated}
          className="w-full py-6 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-white font-black text-2xl shadow-xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 flex justify-center items-center gap-3"
          data-testid="btn-save-checklist"
        >
          {updateMutation.isPending
            ? <Loader2 className="w-8 h-8 animate-spin" />
            : <><Save className="w-7 h-7" /> 저장하기</>
          }
        </button>

        <button
          onClick={() => setLocation("/dashboard")}
          className="w-full py-5 rounded-2xl border-2 border-border bg-white text-secondary font-bold text-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:border-primary/40"
        >
          <LayoutDashboard className="w-6 h-6" /> 대시보드로 이동
        </button>
      </div>
    </Layout>
  );
}
