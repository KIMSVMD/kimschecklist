import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Layout } from "@/components/Layout";
import { useChecklist, useUploadPhoto } from "@/hooks/use-checklists";
import { useGuideByProduct } from "@/hooks/use-guides";
import { useUpdateChecklist } from "@/hooks/use-checklists";
import { motion } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  XOctagon,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Package,
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
  const updateMutation = useUpdateChecklist();
  const uploadMutation = useUploadPhoto();

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form state once checklist loads
  useEffect(() => {
    if (checklist) {
      setPhotoUrl(checklist.photoUrl || null);
      setLocalPreview(checklist.photoUrl || null);
      setItems((checklist.items as Record<string, string>) || {});
      setNotes(checklist.notes || "");
    }
  }, [checklist]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalPreview(URL.createObjectURL(file));
    try {
      const url = await uploadMutation.mutateAsync(file);
      setPhotoUrl(url);
    } catch {
      toast({ title: "업로드 실패", description: "사진을 다시 업로드해주세요.", variant: "destructive" });
      setLocalPreview(checklist?.photoUrl || null);
    }
  };

  const handleSubmit = async () => {
    if (!checklist) return;
    const hasPoor = Object.values(items).includes("poor");
    const hasAverage = Object.values(items).includes("average");
    const finalStatus = hasPoor ? "poor" : hasAverage ? "average" : "excellent";

    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          status: finalStatus,
          photoUrl: photoUrl || null,
          notes: notes || null,
          items,
        },
      });
      toast({ title: "수정 완료!", description: "점검 내용이 업데이트되었습니다." });
      setLocation("/dashboard");
    } catch (err) {
      toast({ title: "수정 실패", description: String(err), variant: "destructive" });
    }
  };

  if (checklistLoading) {
    return (
      <Layout title="점검 수정" showBack={true}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!checklist) {
    return (
      <Layout title="점검 수정" showBack={true}>
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
                <h3 className="text-xl font-bold">표준 진열 가이드</h3>
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
          <h3 className="text-xl font-bold text-secondary">현장 사진</h3>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full relative aspect-video rounded-3xl border-4 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center overflow-hidden active:scale-[0.98] transition-all group"
          >
            {localPreview && (
              <img src={localPreview} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
            )}
            {guideImage && (
              <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-multiply">
                <img src={guideImage} className="w-full h-full object-contain bg-white grayscale" alt="Overlay" />
              </div>
            )}
            <div className={`relative z-10 flex flex-col items-center p-6 rounded-2xl backdrop-blur-sm ${localPreview ? "bg-black/50 text-white" : "bg-white/80 text-primary"}`}>
              {uploadMutation.isPending ? (
                <Loader2 className="w-12 h-12 animate-spin mb-2" />
              ) : (
                <Camera className="w-12 h-12 mb-2" />
              )}
              <span className="font-bold text-lg">{localPreview ? "다시 촬영하기" : "탭하여 사진 촬영"}</span>
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        </div>

        {/* Per-item Status */}
        {guideItems.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-secondary">항목별 진열 상태 평가</h3>
            {guideItems.map((item) => (
              <div key={item} className="space-y-3 p-4 bg-muted/30 rounded-2xl border border-border/50">
                <h4 className="text-lg font-bold text-secondary">{item}</h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "excellent", label: "우수", icon: CheckCircle2, active: "bg-blue-500 border-blue-600 text-white shadow-md", inactive: "bg-white border-border text-muted-foreground" },
                    { id: "average", label: "보통", icon: AlertTriangle, active: "bg-amber-500 border-amber-600 text-white shadow-md", inactive: "bg-white border-border text-muted-foreground" },
                    { id: "poor", label: "미흡", icon: XOctagon, active: "bg-primary border-red-700 text-white shadow-md", inactive: "bg-white border-border text-muted-foreground" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setItems((prev) => ({ ...prev, [item]: s.id }))}
                      className={`flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all active:scale-95 ${items[item] === s.id ? s.active : s.inactive}`}
                    >
                      <s.icon className="w-8 h-8 mb-1" />
                      <span className="text-sm font-bold">{s.label}</span>
                    </button>
                  ))}
                </div>
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={updateMutation.isPending || uploadMutation.isPending || !allItemsEvaluated}
          className="w-full py-6 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-white font-black text-2xl shadow-xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {updateMutation.isPending ? <Loader2 className="w-8 h-8 animate-spin" /> : "수정 완료"}
        </button>
        {guideItems.length > 0 && !allItemsEvaluated && (
          <p className="text-center text-sm text-muted-foreground -mt-4">모든 평가 항목을 선택해주세요</p>
        )}
      </div>
    </Layout>
  );
}
