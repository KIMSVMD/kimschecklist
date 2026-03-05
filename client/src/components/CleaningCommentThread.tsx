import { useState, useRef } from "react";
import { MessageSquare, CheckCheck, Send, Loader2, CornerDownRight, ShieldCheck, UserRound, Camera, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useCleaningReplies, useAddCleaningReply, useConfirmCleaningComment } from "@/hooks/use-cleaning";
import { useToast } from "@/hooks/use-toast";
import type { CleaningReply } from "@shared/schema";

interface Props {
  cleaningId: number;
  adminComment?: string | null;
  confirmed?: boolean | null;
  isAdmin: boolean;
  hideComment?: boolean;
}

export function CleaningCommentThread({ cleaningId, adminComment, confirmed, isAdmin, hideComment = false }: Props) {
  const { toast } = useToast();
  const { data: replies = [], isLoading } = useCleaningReplies(adminComment ? cleaningId : null);
  const addReplyMutation = useAddCleaningReply();
  const confirmMutation = useConfirmCleaningComment();

  const [replyText, setReplyText] = useState("");
  const [replyPhoto, setReplyPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!adminComment) return null;

  const handleConfirm = async () => {
    try {
      await confirmMutation.mutateAsync(cleaningId);
      toast({ title: "확인 완료", description: "코멘트를 확인했습니다." });
    } catch {
      toast({ title: "처리 실패", variant: "destructive" });
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const { uploadFile } = await import("@/lib/upload");
      const objectPath = await uploadFile(file);
      setReplyPhoto(objectPath);
    } catch {
      toast({ title: "사진 업로드 실패", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSendReply = async () => {
    const trimmed = replyText.trim();
    if (!trimmed && !replyPhoto) return;
    try {
      await addReplyMutation.mutateAsync({
        id: cleaningId,
        content: trimmed || "(사진 첨부)",
        authorType: isAdmin ? "admin" : "staff",
        photoUrl: replyPhoto,
      });
      setReplyText("");
      setReplyPhoto(null);
      setShowInput(false);
      toast({ title: "답글이 전송됐습니다" });
    } catch {
      toast({ title: "전송 실패", variant: "destructive" });
    }
  };

  const isConfirmed = !!confirmed;
  const canReply = isAdmin || isConfirmed;

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${isConfirmed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      {!hideComment && (
        <>
          <div className="flex items-center gap-2 px-4 pt-3 pb-1">
            <MessageSquare className={`w-4 h-4 ${isConfirmed ? "text-emerald-600" : "text-amber-600"}`} />
            <span className={`text-xs font-black uppercase tracking-wide ${isConfirmed ? "text-emerald-600" : "text-amber-600"}`}>
              관리자 코멘트
            </span>
            {isConfirmed && (
              <span className="ml-auto text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> 확인완료
              </span>
            )}
          </div>
          <div className="px-4 pb-3">
            <p className="text-secondary text-sm font-medium leading-relaxed">{adminComment}</p>
          </div>
        </>
      )}

      {/* Confirm button — staff only, until confirmed */}
      {!isAdmin && !isConfirmed && (
        <div className="px-4 pb-3">
          <button
            onClick={handleConfirm}
            disabled={confirmMutation.isPending}
            className="w-full py-3 rounded-xl bg-amber-500 text-white font-black text-base flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            data-testid={`btn-confirm-cleaning-${cleaningId}`}
          >
            {confirmMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-5 h-5" />}
            확인했습니다
          </button>
        </div>
      )}

      {/* Reply thread */}
      {canReply && (
        <div className={`${hideComment ? "pt-0" : "border-t border-emerald-200"} px-4 pt-3 pb-4 space-y-2`}>
          {!hideComment && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-secondary/50">
              <CornerDownRight className="w-3.5 h-3.5" />
              <span>답글 스레드</span>
              {isLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
            </div>
          )}
          {hideComment && isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> 답글 불러오는 중...
            </div>
          )}

          {/* Existing replies */}
          <AnimatePresence initial={false}>
            {replies.map((reply: CleaningReply) => {
              const isAdminReply = reply.authorType === "admin";
              return (
                <motion.div
                  key={reply.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex gap-2.5 ${isAdminReply ? "" : "flex-row-reverse"}`}
                >
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${isAdminReply ? "bg-primary/10" : "bg-emerald-100"}`}>
                    {isAdminReply
                      ? <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      : <UserRound className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <div className={`flex-1 min-w-0 ${isAdminReply ? "" : "text-right"}`}>
                    <div className={`inline-block text-left rounded-2xl px-3 py-2.5 max-w-[85%] ${isAdminReply ? "bg-white border border-border shadow-sm" : "bg-emerald-500 text-white"}`}>
                      {(reply as any).photoUrl && (
                        <img
                          src={(reply as any).photoUrl}
                          alt="첨부 사진"
                          className="w-full max-w-[200px] rounded-xl mb-2 object-cover"
                        />
                      )}
                      {reply.content !== "(사진 첨부)" && (
                        <p className={`text-sm font-medium leading-relaxed ${isAdminReply ? "text-secondary" : "text-white"}`}>
                          {reply.content}
                        </p>
                      )}
                    </div>
                    <p className={`text-[10px] text-muted-foreground mt-1 ${isAdminReply ? "pl-1" : "pr-1"}`}>
                      {isAdminReply ? "관리자" : "현장직원"} ·{" "}
                      {format(new Date(reply.createdAt), "M월 d일 HH:mm", { locale: ko })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Reply input */}
          {showInput ? (
            <div className="space-y-2 pt-1">
              {/* Photo preview / upload */}
              <button
                onClick={() => fileRef.current?.click()}
                className={`w-full h-20 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  replyPhoto ? "border-emerald-400 bg-emerald-50" : "border-slate-300 bg-white hover:bg-slate-50"
                }`}
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                ) : replyPhoto ? (
                  <div className="relative w-full h-full">
                    <img src={replyPhoto} alt="첨부" className="w-full h-full object-cover rounded-xl" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                      <span className="text-white text-xs font-bold">사진 변경</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-bold text-slate-500">완료 사진 첨부 (선택)</span>
                  </>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }}
              />

              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={isAdmin ? "관리자로 답글을 남기세요..." : "청소 완료 내용을 남기세요..."}
                className="w-full rounded-xl border border-emerald-300 bg-white p-3 text-sm text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400/40 min-h-[4rem]"
                autoFocus
                data-testid={`textarea-thread-reply-${cleaningId}`}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSendReply}
                  disabled={addReplyMutation.isPending || (!replyText.trim() && !replyPhoto)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                  data-testid={`btn-send-thread-reply-${cleaningId}`}
                >
                  {addReplyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  전송
                </button>
                <button
                  onClick={() => { setReplyText(""); setReplyPhoto(null); setShowInput(false); }}
                  className="px-4 py-2.5 rounded-xl bg-muted text-muted-foreground font-bold text-sm active:scale-[0.98]"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100/50 active:scale-[0.98] transition-all"
              data-testid={`btn-open-thread-reply-${cleaningId}`}
            >
              {isAdmin ? (
                <><CornerDownRight className="w-4 h-4" /> 관리자 답글 남기기</>
              ) : (
                <><Camera className="w-4 h-4" /> 완료 보고 / 답글</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
