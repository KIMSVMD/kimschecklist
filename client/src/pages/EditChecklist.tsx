import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Layout } from "@/components/Layout";
import { useChecklist, useUploadPhoto, useUpdateChecklist, useSaveChecklistComment, useConfirmChecklistComment, useSaveChecklistReply } from "@/hooks/use-checklists";
import { useGuideByProduct, useAdminStatus } from "@/hooks/use-guides";
import { motion } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
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
  const { data: adminStatus } = useAdminStatus();
  const updateMutation = useUpdateChecklist();
  const uploadMutation = useUploadPhoto();
  const saveCommentMutation = useSaveChecklistComment();
  const confirmMutation = useConfirmChecklistComment();
  const replyMutation = useSaveChecklistReply();

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Initialize form state once checklist loads
  useEffect(() => {
    if (checklist) {
      setPhotoUrl(checklist.photoUrl || null);
      setLocalPreview(checklist.photoUrl || null);
      setItems((checklist.items as Record<string, string>) || {});
      setNotes(checklist.notes || "");
      setCommentText((checklist as any).adminComment || "");
      setReplyText((checklist as any).staffReply || "");
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

            {/* Reply section after confirming */}
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

        {/* Last saved indicator */}
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

        {/* Save button */}
        <button
          onClick={handleSubmit}
          disabled={updateMutation.isPending || uploadMutation.isPending || !allItemsEvaluated}
          className="w-full py-6 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-white font-black text-2xl shadow-xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 flex justify-center items-center gap-3"
        >
          {updateMutation.isPending
            ? <Loader2 className="w-8 h-8 animate-spin" />
            : <><Save className="w-7 h-7" /> 저장하기</>
          }
        </button>

        {/* Go to dashboard */}
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
