import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Layout } from "@/components/Layout";
import { useCreateCleaning, useCleaningInspections } from "@/hooks/use-cleaning";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Camera,
  Loader2,
  MapPin,
  ClipboardList,
  ChevronRight,
  Sun,
  Moon,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { calcCleaningScore, scoreColor } from "@/lib/scoring";

const ZONES = ["입구", "농산", "축산", "수산", "공산"];

const ZONE_ITEMS: Record<string, string[]> = {
  "입구": ["카트 정리 상태"],
  "농산": [
    "바닥 청결", "진열대 청결", "상품 상태", "폐기 상품 여부", "가격표 상태",
    "행사매대 주변 청결", "메인 통로 청결", "쇼케이스 유리 청결", "폐기통 상태",
  ],
  "축산": [
    "바닥 청결", "진열대 청결", "상품 상태", "폐기 상품 여부", "가격표 상태",
    "행사매대 주변 청결", "메인 통로 청결", "쇼케이스 유리 청결", "폐기통 상태",
  ],
  "수산": [
    "바닥 청결", "진열대 청결", "상품 상태", "폐기 상품 여부", "가격표 상태",
    "행사매대 주변 청결", "메인 통로 청결", "쇼케이스 유리 청결", "폐기통 상태",
  ],
  "공산": [
    "바닥 청결", "진열대 청결", "상품 상태", "폐기 상품 여부", "가격표 상태",
    "행사매대 주변 청결", "메인 통로 청결", "쇼케이스 유리 청결", "폐기통 상태",
  ],
};

type ItemData = {
  status: "ok" | "issue" | null;
  photoUrl?: string | null;
  memo?: string | null;
};

// KST date string — if current KST time >= 23:59:59, returns tomorrow's date
// so that drafts appear "reset" at exactly 23:59:59 KST every night
function getKSTDraftDateStr() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const iso = kst.toISOString(); // "YYYY-MM-DDTHH:MM:SS.mmmZ"
  const [h, m, s] = iso.split("T")[1].split(":").map(Number);
  if (h === 23 && m === 59 && s >= 59) {
    // Treat as next day → draft appears reset
    const nextDay = new Date(kst.getTime() + 24 * 60 * 60 * 1000);
    return nextDay.toISOString().split("T")[0];
  }
  return iso.split("T")[0];
}

// For "today" KST comparison (not draft-key related)
function getKSTDateStr() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

type DraftStore = {
  items: Record<string, ItemData>;
  submitted: boolean;
};

function getDraftKey(branch: string, zone: string, time: string) {
  return `cleaning_draft_${branch}_${zone}_${time}_${getKSTDraftDateStr()}`;
}

function loadDraftStore(branch: string, zone: string, time: string): DraftStore {
  try {
    const raw = localStorage.getItem(getDraftKey(branch, zone, time));
    if (!raw) return { items: {}, submitted: false };
    const parsed = JSON.parse(raw);
    // Handle legacy format (plain items object without wrapper)
    if (parsed.items !== undefined) return parsed as DraftStore;
    return { items: parsed, submitted: false };
  } catch {
    return { items: {}, submitted: false };
  }
}

function saveDraftStore(branch: string, zone: string, time: string, store: DraftStore) {
  try {
    localStorage.setItem(getDraftKey(branch, zone, time), JSON.stringify(store));
  } catch {}
}

function getDraftState(branch: string, zone: string, time: string) {
  const store = loadDraftStore(branch, zone, time);
  return {
    hasData: Object.keys(store.items).length > 0,
    submitted: store.submitted,
    items: store.items,
  };
}

export default function CleaningChecklist() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const branch = params.get("branch") || "";

  const { toast } = useToast();
  const createMutation = useCreateCleaning();

  const [step, setStep] = useState<"zone" | "items" | "done">("zone");
  const [selectedZone, setSelectedZone] = useState("");
  const [inspectionTime, setInspectionTime] = useState<"오픈" | "마감">("오픈");
  const [itemData, setItemData] = useState<Record<string, ItemData>>({});
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const currentItems = ZONE_ITEMS[selectedZone] || [];
  const allChecked = currentItems.every(item => itemData[item]?.status != null);
  const issueCount = Object.values(itemData).filter(v => v.status === "issue").length;

  // Today's zone scores for this branch — filtered by current inspectionTime
  const today = new Date().toISOString().split("T")[0];
  const { data: todayRecords = [] } = useCleaningInspections(branch ? { branch } : {});
  const zoneScores: Record<string, number | null> = {};
  ZONES.forEach(z => { zoneScores[z] = null; });
  (todayRecords as any[]).filter(r => {
    return new Date(r.createdAt).toISOString().split("T")[0] === today
      && r.inspectionTime === inspectionTime;
  }).forEach(r => {
    const items = r.items as Record<string, { status: string }> || {};
    const score = calcCleaningScore(items);
    if (zoneScores[r.zone] === null || score > (zoneScores[r.zone] ?? 0)) {
      zoneScores[r.zone] = score;
    }
  });

  // Load draft when zone or inspectionTime changes
  useEffect(() => {
    if (step === "items" && selectedZone && branch) {
      const { items } = loadDraftStore(branch, selectedZone, inspectionTime);
      setItemData(items);
    }
  }, [step, selectedZone, inspectionTime, branch]);

  // Save draft whenever itemData changes (while in items step)
  // Preserve existing submitted flag so "제출완료" badge stays correct
  useEffect(() => {
    if (step === "items" && selectedZone && branch && Object.keys(itemData).length > 0) {
      const existing = loadDraftStore(branch, selectedZone, inspectionTime);
      saveDraftStore(branch, selectedZone, inspectionTime, {
        items: itemData,
        submitted: existing.submitted,
      });
    }
  }, [itemData, step, selectedZone, inspectionTime, branch]);

  const handleZoneSelect = (zone: string) => {
    setSelectedZone(zone);
    setStep("items");
    // Draft will be loaded via useEffect
  };

  const handleStatusSet = (item: string, status: "ok" | "issue") => {
    setItemData(prev => ({
      ...prev,
      [item]: {
        ...prev[item],
        status,
      },
    }));
  };

  const handlePhotoUpload = async (item: string, file: File) => {
    setUploadingItem(item);
    try {
      const { uploadFile } = await import("@/lib/upload");
      const objectPath = await uploadFile(file);
      setItemData(prev => ({ ...prev, [item]: { ...prev[item], photoUrl: objectPath } }));
    } catch {
      toast({ title: "사진 업로드 실패", variant: "destructive" });
    } finally {
      setUploadingItem(null);
    }
  };

  const handleSubmit = async () => {
    const items: Record<string, { status: string; photoUrl?: string | null; memo?: string | null }> = {};
    currentItems.forEach(item => {
      items[item] = {
        status: itemData[item]?.status || "ok",
        photoUrl: itemData[item]?.photoUrl || null,
        memo: itemData[item]?.memo || null,
      };
    });
    const hasIssue = Object.values(items).some(v => v.status === "issue");

    try {
      await createMutation.mutateAsync({
        branch,
        zone: selectedZone,
        inspectionTime,
        items,
        overallStatus: hasIssue ? "issue" : "ok",
      });
      // Mark draft as submitted (don't clear — user should see their data if they return)
      saveDraftStore(branch, selectedZone, inspectionTime, {
        items: itemData,
        submitted: true,
      });
      setStep("done");
    } catch (err) {
      toast({ title: "저장 실패", description: String(err), variant: "destructive" });
    }
  };

  const getDraftInfo = (zone: string) => getDraftState(branch, zone, inspectionTime);

  return (
    <Layout title="매장 청소 점검" showBack={true}>
      <div className="flex flex-col h-full bg-background">
        {/* Progress bar */}
        <div className="w-full bg-muted h-2">
          <motion.div
            className="h-full bg-emerald-500"
            animate={{ width: step === "zone" ? "33%" : step === "items" ? "66%" : "100%" }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {step === "zone" && (
              <motion.div
                key="zone"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                    <MapPin className="w-4 h-4" />
                    {branch}점 청소 점검
                  </div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-black text-secondary">구역 선택</h2>
                    {(() => {
                      const scored = Object.values(zoneScores).filter(v => v !== null) as number[];
                      if (scored.length === 0) return null;
                      const avg = Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
                      return (
                        <div className={`px-3 py-1.5 rounded-xl border font-black text-base ${scoreColor(avg)}`}
                          data-testid="text-avg-score">
                          평균 {avg}점
                        </div>
                      );
                    })()}
                  </div>
                  <p className="text-muted-foreground text-lg">점검할 매장 구역을 선택하세요.</p>
                </div>

                {/* Inspection time toggle */}
                <div className="flex bg-muted p-1.5 rounded-2xl">
                  <button
                    onClick={() => setInspectionTime("오픈")}
                    className={`flex-1 py-4 text-xl font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${inspectionTime === "오픈" ? "bg-white text-emerald-600 shadow-sm" : "text-muted-foreground"}`}
                    data-testid="btn-time-open"
                  >
                    <Sun className="w-5 h-5" /> 오픈 전
                  </button>
                  <button
                    onClick={() => setInspectionTime("마감")}
                    className={`flex-1 py-4 text-xl font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${inspectionTime === "마감" ? "bg-white text-secondary shadow-sm" : "text-muted-foreground"}`}
                    data-testid="btn-time-close"
                  >
                    <Moon className="w-5 h-5" /> 마감
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {ZONES.map(zone => {
                    const zs = zoneScores[zone];
                    const draftInfo = getDraftInfo(zone);
                    return (
                      <button
                        key={zone}
                        onClick={() => handleZoneSelect(zone)}
                        className="flex items-center justify-between p-6 rounded-3xl border-2 border-border bg-white text-secondary hover:border-emerald-400 hover:bg-emerald-50 transition-all active:scale-[0.98] shadow-sm"
                        data-testid={`btn-zone-${zone}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold">{zone}</span>
                          {draftInfo.hasData && draftInfo.submitted && (
                            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              제출완료
                            </span>
                          )}
                          {draftInfo.hasData && !draftInfo.submitted && (
                            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                              작성 중
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {zs !== null ? (
                            <div className={`px-3 py-1 rounded-xl border text-sm font-black ${scoreColor(zs)}`}
                              data-testid={`score-zone-${zone}`}>
                              {zs}점
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">{ZONE_ITEMS[zone]?.length || 0}개</span>
                          )}
                          <ChevronRight className="w-6 h-6 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === "items" && (
              <motion.div
                key="items"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-5 pb-10"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                    <ClipboardList className="w-4 h-4" />
                    {branch}점 · {selectedZone} · {inspectionTime} 점검
                  </div>
                  <h2 className="text-3xl font-black text-secondary">항목 점검</h2>
                  <p className="text-muted-foreground">각 항목의 상태를 체크하세요.</p>
                </div>

                {/* Legend + Score */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> 이상없음</span>
                    <span className="flex items-center gap-1 text-primary"><XCircle className="w-4 h-4" /> 문제있음</span>
                  </div>
                  {(() => {
                    const scored: Record<string, { status: string }> = {};
                    currentItems.forEach(i => { if (itemData[i]?.status) scored[i] = { status: itemData[i].status! }; });
                    const score = calcCleaningScore(scored);
                    const done = Object.keys(scored).length;
                    const total = currentItems.length;
                    return done > 0 ? (
                      <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-sm font-black ${scoreColor(score)}`}
                        data-testid="text-cleaning-score">
                        <span className="text-base">{score}점</span>
                        <span className="text-[10px] font-normal opacity-70">{done}/{total}</span>
                      </div>
                    ) : null;
                  })()}
                </div>

                <div className="space-y-4">
                  {currentItems.map((item, idx) => {
                    const data = itemData[item];
                    const status = data?.status;
                    return (
                      <motion.div
                        key={item}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className={`rounded-3xl border-2 overflow-hidden transition-all ${
                          status === "ok"
                            ? "border-emerald-300 bg-emerald-50"
                            : status === "issue"
                            ? "border-primary bg-red-50"
                            : "border-border bg-white"
                        }`}
                        data-testid={`card-item-${idx}`}
                      >
                        <div className="flex items-center justify-between p-5">
                          <span className="text-xl font-bold text-secondary">{item}</span>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleStatusSet(item, "ok")}
                              className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all active:scale-95 ${
                                status === "ok"
                                  ? "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-200"
                                  : "bg-white border-border text-muted-foreground hover:border-emerald-300"
                              }`}
                              data-testid={`btn-ok-${idx}`}
                            >
                              <CheckCircle2 className="w-8 h-8" />
                            </button>
                            <button
                              onClick={() => handleStatusSet(item, "issue")}
                              className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all active:scale-95 ${
                                status === "issue"
                                  ? "bg-primary border-red-700 text-white shadow-md shadow-red-200"
                                  : "bg-white border-border text-muted-foreground hover:border-red-300"
                              }`}
                              data-testid={`btn-issue-${idx}`}
                            >
                              <XCircle className="w-8 h-8" />
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {status === "ok" && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-4 border-t border-emerald-200">
                                <p className="text-xs font-bold text-emerald-600 pt-3 mb-2 flex items-center gap-1">
                                  <Camera className="w-3.5 h-3.5" /> 사진 첨부 (선택)
                                </p>
                                <button
                                  onClick={() => fileRefs.current[item]?.click()}
                                  className={`w-full h-20 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                                    data?.photoUrl ? "border-emerald-400 bg-emerald-50" : "border-emerald-200 bg-emerald-50/50"
                                  }`}
                                >
                                  {uploadingItem === item ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                                  ) : data?.photoUrl ? (
                                    <div className="relative w-full h-full">
                                      <img src={data.photoUrl} className="w-full h-full object-cover rounded-xl" alt="Ok photo" />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                                        <span className="text-white text-xs font-bold">사진 변경</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <Camera className="w-5 h-5 text-emerald-400" />
                                      <span className="text-xs font-medium text-emerald-500">사진 추가</span>
                                    </>
                                  )}
                                </button>
                                <input
                                  ref={el => { fileRefs.current[item] = el; }}
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(item, f); }}
                                />
                              </div>
                            </motion.div>
                          )}
                          {status === "issue" && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 space-y-3 border-t border-red-200">
                                <p className="text-sm font-bold text-primary pt-3 flex items-center gap-1.5">
                                  <AlertCircle className="w-4 h-4" /> 문제 상세 기록
                                </p>

                                <button
                                  onClick={() => fileRefs.current[item]?.click()}
                                  className={`w-full h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                                    data?.photoUrl ? "border-primary/40 bg-primary/5" : "border-red-300 bg-red-50"
                                  }`}
                                >
                                  {uploadingItem === item ? (
                                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                                  ) : data?.photoUrl ? (
                                    <div className="relative w-full h-full">
                                      <img src={data.photoUrl} className="w-full h-full object-cover rounded-xl" alt="Issue photo" />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                                        <span className="text-white text-sm font-bold">사진 변경</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <Camera className="w-7 h-7 text-red-400" />
                                      <span className="text-sm font-bold text-red-500">문제 사진 촬영</span>
                                    </>
                                  )}
                                </button>
                                <input
                                  ref={el => { fileRefs.current[item] = el; }}
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(item, f); }}
                                />

                                <textarea
                                  placeholder="문제 내용을 간략히 메모하세요..."
                                  value={data?.memo || ""}
                                  onChange={e => setItemData(prev => ({ ...prev, [item]: { ...prev[item], memo: e.target.value } }))}
                                  className="w-full p-4 rounded-2xl border-2 border-red-200 bg-white text-base focus:outline-none focus:border-primary transition-all resize-none h-20"
                                  data-testid={`textarea-memo-${idx}`}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground font-medium pt-2">
                  <span>{Object.values(itemData).filter(v => v.status != null).length} / {currentItems.length} 완료</span>
                  {issueCount > 0 && (
                    <span className="text-primary font-bold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> 문제 {issueCount}건
                    </span>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!allChecked || createMutation.isPending}
                  className="w-full py-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-2xl shadow-xl shadow-emerald-200 active:scale-[0.98] transition-all disabled:opacity-50 flex justify-center items-center gap-3"
                  data-testid="btn-submit-cleaning"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <>점검 완료 저장</>
                  )}
                </button>
                {!allChecked && (
                  <p className="text-center text-sm text-muted-foreground">모든 항목을 체크해주세요</p>
                )}
              </motion.div>
            )}

            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-20 space-y-6 text-center"
              >
                <div className="w-28 h-28 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-secondary mb-2">점검 완료!</h2>
                  <p className="text-muted-foreground text-lg">
                    <strong className="text-secondary">{branch}점 {selectedZone}</strong> 청소 점검이 저장되었습니다.
                  </p>
                  {issueCount > 0 && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                      <AlertCircle className="w-5 h-5 text-primary" />
                      <span className="text-primary font-bold">문제 {issueCount}건 기록됨</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col w-full gap-3 pt-4">
                  <button
                    onClick={() => { setStep("zone"); setSelectedZone(""); setItemData({}); }}
                    className="w-full py-5 rounded-2xl bg-emerald-500 text-white font-black text-xl shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all"
                  >
                    다른 구역 점검하기
                  </button>
                  <button
                    onClick={() => setLocation("/")}
                    className="w-full py-5 rounded-2xl border-2 border-border bg-white text-secondary font-bold text-xl active:scale-[0.98] transition-all"
                  >
                    홈으로 이동
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
