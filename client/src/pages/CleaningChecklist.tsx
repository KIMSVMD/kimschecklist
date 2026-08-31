import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Layout } from "@/components/Layout";
import { useCreateCleaning, useCleaningInspections, checkCleaningPhotoHash } from "@/hooks/use-cleaning";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Camera,
  Loader2,
  MapPin,
  ClipboardList,
  ChevronRight,
  AlertCircle,
  Droplets,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { calcCleaningScore, scoreColor } from "@/lib/scoring";

const ZONES = ["공통", "농산", "축산", "수산", "공산"];

const ZONE_ITEMS: Record<string, string[]> = {
  "공통": [
    "카트 정리 상태", "카트/장바구니 보관구역", "유/무인 계산대",
    "매장 바닥(델리 등)", "상온 매대(델리 등)", "냉장 S/C(델리 등)",
  ],
  "농산": [
    "바닥 청결", "진열대 청결(상온)", "진열대 청결(냉장,냉동 S/C)", "냉동평대(이동식)",
    "행사매대 주변 청결", "메인 통로 청결", "쇼케이스 외관 및 하단",
  ],
  "축산": [
    "바닥 청결", "진열대 청결(상온)", "진열대 청결(냉장,냉동 S/C)", "냉동평대(이동식)",
    "행사매대 주변 청결", "메인 통로 청결", "쇼케이스 외관 및 하단",
  ],
  "수산": [
    "바닥 청결", "진열대 청결(상온)", "진열대 청결(냉장,냉동 S/C)", "냉동평대(이동식)",
    "행사매대 주변 청결", "메인 통로 청결", "쇼케이스 외관 및 하단",
  ],
  "공산": [
    "바닥 청결", "진열대 청결(상온)", "진열대 청결(냉장,냉동 S/C)", "냉동평대(이동식)",
    "행사매대 주변 청결", "메인 통로 청결", "쇼케이스 외관 및 하단",
  ],
};

const ITEM_DESCRIPTIONS: Record<string, Record<string, string>> = {
  "공통": {
    "카트 정리 상태": "카트 내부에 쓰레기, 스티커 및 카트 보관 정리 상태",
    "카트/장바구니 보관구역": "카트/장바구니 내부에 쓰레기, 스티커 및 정리 상태",
    "유/무인 계산대": "스티커 자국, 오염물, 흙, 먼지는 없는가?",
    "매장 바닥(델리 등)": "매장 바닥에 찌든때나 먼지, 쓰레기는 없는가?",
    "상온 매대(델리 등)": "진열매대에 오염물, 먼지, 쓰레기는 없는가?",
    "냉장 S/C(델리 등)": "냉장 쇼케이스에는 오염물, 먼지, 쓰레기는 없는가?",
  },
  "농산": {
    "바닥 청결": "블랙 스팟이나 물기, 음식물은 없는가?",
    "진열대 청결(상온)": "상온매대에 먼지나, 이물질, 오염물질은 없는가?",
    "진열대 청결(냉장,냉동 S/C)": "냉장·냉동 S/C에 먼지나, 이물질, 오염물질은 없는가?",
    "냉동평대(이동식)": "평대 내외부는 스티커자국, 이물질, 흙, 오염물은 없는가?",
    "행사매대 주변 청결": "먼지나 이물질, 시식용품(종이컵, 이쑤시개 등)은 없는가?",
    "메인 통로 청결": "주동선상에 먼지, 스티커, 종이 등 떨어져 있지 않은가?",
    "쇼케이스 외관 및 하단": "쇼케이스 흡입구나 외관에 먼지나, 흙, 오염물은 없는가?",
  },
  "축산": {
    "바닥 청결": "블랙 스팟이나 물기, 음식물은 없는가?",
    "진열대 청결(상온)": "상온매대에 먼지나, 이물질, 오염물질은 없는가?",
    "진열대 청결(냉장,냉동 S/C)": "냉장·냉동 S/C에 먼지나, 이물질, 오염물질은 없는가?",
    "냉동평대(이동식)": "평대 내외부는 스티커자국, 이물질, 흙, 오염물은 없는가?",
    "행사매대 주변 청결": "먼지나 이물질, 시식용품(종이컵, 이쑤시개 등)은 없는가?",
    "메인 통로 청결": "주동선상에 먼지, 스티커, 종이 등 떨어져 있지 않은가?",
    "쇼케이스 외관 및 하단": "쇼케이스 흡입구나 외관에 먼지나, 흙, 오염물은 없는가?",
  },
  "수산": {
    "바닥 청결": "블랙 스팟이나 물기, 음식물은 없는가?",
    "진열대 청결(상온)": "상온매대에 먼지나, 이물질, 오염물질은 없는가?",
    "진열대 청결(냉장,냉동 S/C)": "냉장·냉동 S/C에 먼지나, 이물질, 오염물질은 없는가?",
    "냉동평대(이동식)": "평대 내외부는 스티커자국, 이물질, 흙, 오염물은 없는가?",
    "행사매대 주변 청결": "먼지나 이물질, 시식용품(종이컵, 이쑤시개 등)은 없는가?",
    "메인 통로 청결": "주동선상에 먼지, 스티커, 종이 등 떨어져 있지 않은가?",
    "쇼케이스 외관 및 하단": "쇼케이스 흡입구나 외관에 먼지나, 흙, 오염물은 없는가?",
  },
  "공산": {
    "바닥 청결": "블랙 스팟이나 물기, 음식물은 없는가?",
    "진열대 청결(상온)": "상온매대에 먼지나, 이물질, 오염물질은 없는가?",
    "진열대 청결(냉장,냉동 S/C)": "냉장·냉동 S/C에 먼지나, 이물질, 오염물질은 없는가?",
    "냉동평대(이동식)": "평대 내외부는 스티커자국, 이물질, 흙, 오염물은 없는가?",
    "행사매대 주변 청결": "먼지나 이물질, 시식용품(종이컵, 이쑤시개 등)은 없는가?",
    "메인 통로 청결": "주동선상에 먼지, 스티커, 종이 등 떨어져 있지 않은가?",
    "쇼케이스 외관 및 하단": "쇼케이스 흡입구나 외관에 먼지나, 흙, 오염물은 없는가?",
  },
};

type ItemData = {
  status: "ok" | "issue" | null;
  beforePhotoUrl?: string | null;
  beforePhotoHash?: string | null;
  afterPhotoUrl?: string | null;
  afterPhotoHash?: string | null;
  memo?: string | null;
};

type PhotoSlot = "before" | "after";

function getKSTDraftDateStr() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const iso = kst.toISOString();
  const [h, m, s] = iso.split("T")[1].split(":").map(Number);
  if (h === 23 && m === 59 && s >= 59) {
    const nextDay = new Date(kst.getTime() + 24 * 60 * 60 * 1000);
    return nextDay.toISOString().split("T")[0];
  }
  return iso.split("T")[0];
}

// Monday-start calendar week containing `d`
function getMondayOfWeek(d: Date) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - diff);
  return date;
}

// Week 1 = the calendar week (Mon–Sun) containing the 1st of the month
function getCurrentMonthWeek() {
  const now = new Date();
  const firstMonday = getMondayOfWeek(new Date(now.getFullYear(), now.getMonth(), 1));
  const thisMonday = getMondayOfWeek(now);
  const week = Math.round((thisMonday.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return { month: now.getMonth() + 1, week };
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
  const inspectionTime = "오픈" as const;
  const [itemData, setItemData] = useState<Record<string, ItemData>>({});
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const currentItems = ZONE_ITEMS[selectedZone] || [];
  const allChecked = currentItems.every(item => itemData[item]?.status != null);
  const itemsMissingPhotos = currentItems.filter(item => {
    const d = itemData[item];
    return d?.status != null && (!d.beforePhotoUrl || !d.afterPhotoUrl);
  });
  const canSubmit = allChecked && itemsMissingPhotos.length === 0;
  const issueCount = Object.values(itemData).filter(v => v.status === "issue").length;

  const { data: branchRecords = [] } = useCleaningInspections(branch ? { branch } : {});
  const weekStart = getMondayOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const currentMonthWeek = getCurrentMonthWeek();

  const zoneScores: Record<string, number | null> = {};
  ZONES.forEach(z => { zoneScores[z] = null; });
  (branchRecords as any[]).filter(r => {
    const d = new Date(r.createdAt);
    return d >= weekStart && d <= weekEnd && r.inspectionTime === inspectionTime;
  }).forEach(r => {
    const items = r.items as Record<string, { status: string }> || {};
    const score = calcCleaningScore(items);
    if (zoneScores[r.zone] === null || score > (zoneScores[r.zone] ?? 0)) {
      zoneScores[r.zone] = score;
    }
  });

  useEffect(() => {
    if (step === "items" && selectedZone && branch) {
      const { items } = loadDraftStore(branch, selectedZone, inspectionTime);
      setItemData(items);
    }
  }, [step, selectedZone, inspectionTime, branch]);

  useEffect(() => {
    if (step === "items" && selectedZone && branch && Object.keys(itemData).length > 0) {
      const existing = loadDraftStore(branch, selectedZone, inspectionTime);
      saveDraftStore(branch, selectedZone, inspectionTime, {
        items: itemData,
        submitted: existing.submitted,
      });
    }
  }, [itemData, step, selectedZone, inspectionTime, branch]);

  // Browser/swipe/bottom-nav back while on the item checklist should return to zone
  // selection on this same page, not leave the page entirely.
  useEffect(() => {
    const onPopState = () => {
      setStep(prev => (prev === "items" || prev === "done" ? "zone" : prev));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleZoneSelect = (zone: string) => {
    if (zoneScores[zone] !== null) {
      toast({
        title: `${currentMonthWeek.month}월 ${currentMonthWeek.week}주차 점검은 이미 완료되었습니다`,
        description: "다음 주에 다시 점검할 수 있어요.",
      });
      return;
    }
    setSelectedZone(zone);
    setStep("items");
    window.history.pushState({ cleaningStep: "items" }, "");
  };

  const handleStatusSet = (item: string, status: "ok" | "issue") => {
    setItemData(prev => ({
      ...prev,
      [item]: { ...prev[item], status },
    }));
  };

  const handlePhotoUpload = async (item: string, slot: PhotoSlot, file: File) => {
    const slotKey = `${item}:${slot}`;
    setUploadingSlot(slotKey);
    try {
      const { uploadFile, hashFile } = await import("@/lib/upload");
      const hash = await hashFile(file);

      const otherField = slot === "before" ? "afterPhotoHash" : "beforePhotoHash";
      if (itemData[item]?.[otherField] === hash) {
        toast({ title: "전/후 사진이 같습니다", description: "다른 사진을 올려주세요.", variant: "destructive" });
        return;
      }

      const { duplicate, match } = await checkCleaningPhotoHash(hash);
      if (duplicate) {
        toast({
          title: "이미 업로드된 사진입니다",
          description: match ? `${match.branch}점 · ${match.zone} · ${match.item}에서 이미 사용된 사진이에요. 새로 촬영해주세요.` : "새로 촬영해주세요.",
          variant: "destructive",
        });
        return;
      }

      const objectPath = await uploadFile(file, { compress: true });
      const urlField = slot === "before" ? "beforePhotoUrl" : "afterPhotoUrl";
      const hashField = slot === "before" ? "beforePhotoHash" : "afterPhotoHash";
      setItemData(prev => ({ ...prev, [item]: { ...prev[item], [urlField]: objectPath, [hashField]: hash } }));
    } catch {
      toast({ title: "사진 업로드 실패", variant: "destructive" });
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleSubmit = async () => {
    const items: Record<string, { status: string; beforePhotoUrl?: string | null; beforePhotoHash?: string | null; afterPhotoUrl?: string | null; afterPhotoHash?: string | null; memo?: string | null }> = {};
    currentItems.forEach(item => {
      items[item] = {
        status: itemData[item]?.status || "ok",
        beforePhotoUrl: itemData[item]?.beforePhotoUrl || null,
        beforePhotoHash: itemData[item]?.beforePhotoHash || null,
        afterPhotoUrl: itemData[item]?.afterPhotoUrl || null,
        afterPhotoHash: itemData[item]?.afterPhotoHash || null,
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

  const renderPhotoSlot = (
    item: string,
    slot: PhotoSlot,
    label: string,
    url: string | null | undefined,
    theme: "emerald" | "red",
  ) => {
    const key = `${item}:${slot}`;
    const isUploading = uploadingSlot === key;
    const emptyBorder = theme === "emerald" ? "border-emerald-200 bg-emerald-50/50" : "border-red-300 bg-red-50";
    const filledBorder = theme === "emerald" ? "border-emerald-400 bg-emerald-50" : "border-primary/40 bg-primary/5";
    const spinColor = theme === "emerald" ? "text-emerald-500" : "text-primary";
    const iconColor = theme === "emerald" ? "text-emerald-400" : "text-red-400";
    const labelColor = theme === "emerald" ? "text-emerald-500" : "text-red-500";
    return (
      <div key={key} className="relative">
        <button
          type="button"
          onClick={() => fileRefs.current[key]?.click()}
          className={`w-full h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] ${url ? filledBorder : emptyBorder}`}
        >
          <span className={`absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/80 ${labelColor}`}>
            {label}
          </span>
          {isUploading ? (
            <Loader2 className={`w-6 h-6 animate-spin ${spinColor}`} />
          ) : url ? (
            <div className="relative w-full h-full">
              <img src={url} className="w-full h-full object-cover rounded-xl" alt={label} />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                <span className="text-white text-xs font-bold">변경</span>
              </div>
            </div>
          ) : (
            <>
              <Camera className={`w-5 h-5 ${iconColor}`} />
              <span className={`text-xs font-medium ${labelColor}`}>{label} 촬영</span>
            </>
          )}
        </button>
        <input
          ref={el => { fileRefs.current[key] = el; }}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(item, slot, f); }}
        />
      </div>
    );
  };

  const progressWidth = step === "zone" ? "33%" : step === "items" ? "66%" : "100%";

  return (
    <Layout title="매장 청소 점검" showBack={true}>
      <div className="flex flex-col h-full bg-background">
        {/* Progress bar */}
        <div className="w-full bg-muted h-1.5">
          <motion.div
            className="h-full"
            style={{ background: "#006341" }}
            animate={{ width: progressWidth }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-[50px] space-y-6 pb-10">
          <AnimatePresence mode="wait">

            {/* ── ZONE SELECTION ── */}
            {step === "zone" && (
              <motion.div
                key="zone"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Header */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "#006341" }}>
                    <MapPin className="w-3.5 h-3.5" />
                    {branch} 청소 점검
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
                          이번주 평균 {avg}점
                        </div>
                      );
                    })()}
                  </div>
                  <p className="text-muted-foreground">점검할 매장 구역을 선택하세요.</p>
                </div>

                {/* Zone list */}
                <div className="flex flex-col gap-3">
                  {ZONES.map(zone => {
                    const zs = zoneScores[zone];
                    const weekDone = zs !== null;
                    const draftInfo = getDraftInfo(zone);
                    return (
                      <button
                        key={zone}
                        onClick={() => handleZoneSelect(zone)}
                        className={`flex items-center justify-between p-5 rounded-3xl border-2 border-border bg-white text-secondary transition-all active:scale-[0.98] shadow-sm ${weekDone ? "opacity-70" : ""}`}
                        style={{}}
                        onMouseEnter={e => {
                          if (weekDone) return;
                          (e.currentTarget as HTMLElement).style.borderColor = "#006341";
                          (e.currentTarget as HTMLElement).style.backgroundColor = "#f0faf5";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = "";
                          (e.currentTarget as HTMLElement).style.backgroundColor = "";
                        }}
                        data-testid={`btn-zone-${zone}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <Droplets className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="text-left">
                            <span className="text-lg font-bold text-secondary block">{zone}</span>
                            {weekDone ? (
                              <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                이번주 완료
                              </span>
                            ) : draftInfo.hasData && draftInfo.submitted && (
                              <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                제출완료
                              </span>
                            )}
                            {!weekDone && draftInfo.hasData && !draftInfo.submitted && (
                              <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                작성 중
                              </span>
                            )}
                          </div>
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
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── ITEM CHECKLIST ── */}
            {step === "items" && (
              <motion.div
                key="items"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-5 pb-10"
              >
                {/* Header */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "#006341" }}>
                    <ClipboardList className="w-3.5 h-3.5" />
                    {branch} · {selectedZone} · {inspectionTime} 점검
                  </div>
                  <h2 className="text-3xl font-black text-secondary">항목 점검</h2>
                  <p className="text-muted-foreground text-sm">각 항목의 상태를 체크하세요.</p>
                </div>

                {/* Legend + Score */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" /> 이상없음
                    </span>
                    <span className="flex items-center gap-1 text-primary">
                      <XCircle className="w-4 h-4" /> 문제있음
                    </span>
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

                {/* Item cards */}
                <div className="space-y-3">
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
                            ? "border-red-300 bg-red-50"
                            : "border-border bg-white"
                        }`}
                        data-testid={`card-item-${idx}`}
                      >
                        <div className="flex items-center justify-between px-5 py-4">
                          <div className="flex-1 pr-3">
                            <span className="text-lg font-bold text-secondary block">{item}</span>
                            {ITEM_DESCRIPTIONS[selectedZone]?.[item] && (
                              <span className="text-xs text-muted-foreground block mt-0.5">
                                {ITEM_DESCRIPTIONS[selectedZone][item]}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2.5">
                            <button
                              onClick={() => handleStatusSet(item, "ok")}
                              className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 transition-all active:scale-95 ${
                                status === "ok"
                                  ? "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-200"
                                  : "bg-white border-border text-muted-foreground"
                              }`}
                              data-testid={`btn-ok-${idx}`}
                            >
                              <CheckCircle2 className="w-7 h-7" />
                            </button>
                            <button
                              onClick={() => handleStatusSet(item, "issue")}
                              className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 transition-all active:scale-95 ${
                                status === "issue"
                                  ? "bg-primary border-red-700 text-white shadow-md shadow-red-200"
                                  : "bg-white border-border text-muted-foreground"
                              }`}
                              data-testid={`btn-issue-${idx}`}
                            >
                              <XCircle className="w-7 h-7" />
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
                                  <Camera className="w-3.5 h-3.5" /> 전/후 사진 (필수)
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {renderPhotoSlot(item, "before", "청소 전", data?.beforePhotoUrl, "emerald")}
                                  {renderPhotoSlot(item, "after", "청소 후", data?.afterPhotoUrl, "emerald")}
                                </div>
                                {(!data?.beforePhotoUrl || !data?.afterPhotoUrl) && (
                                  <p className="text-xs text-primary font-bold mt-2 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> 전/후 사진을 모두 첨부해야 저장할 수 있어요
                                  </p>
                                )}
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
                                <div className="grid grid-cols-2 gap-2">
                                  {renderPhotoSlot(item, "before", "청소 전", data?.beforePhotoUrl, "red")}
                                  {renderPhotoSlot(item, "after", "청소 후", data?.afterPhotoUrl, "red")}
                                </div>
                                {(!data?.beforePhotoUrl || !data?.afterPhotoUrl) && (
                                  <p className="text-xs text-primary font-bold flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> 전/후 사진을 모두 첨부해야 저장할 수 있어요
                                  </p>
                                )}
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

                {/* Progress count + submit */}
                <div className="flex items-center justify-between text-sm text-muted-foreground font-medium pt-1">
                  <span>{Object.values(itemData).filter(v => v.status != null).length} / {currentItems.length} 완료</span>
                  {issueCount > 0 && (
                    <span className="text-primary font-bold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> 문제 {issueCount}건
                    </span>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || createMutation.isPending}
                  className="w-full py-5 rounded-2xl text-white font-black text-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 flex justify-center items-center gap-3"
                  style={{ background: "#006341" }}
                  data-testid="btn-submit-cleaning"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    <>점검 완료 저장</>
                  )}
                </button>
                {!allChecked ? (
                  <p className="text-center text-sm text-muted-foreground">모든 항목을 체크해주세요</p>
                ) : itemsMissingPhotos.length > 0 && (
                  <p className="text-center text-sm text-primary font-bold" data-testid="text-missing-photos">
                    사진이 없는 항목: {itemsMissingPhotos.join(", ")}
                  </p>
                )}
              </motion.div>
            )}

            {/* ── DONE ── */}
            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex flex-col items-center justify-center py-16 space-y-6 text-center"
              >
                <div className="w-28 h-28 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,99,65,0.1)" }}>
                  <CheckCircle2 className="w-14 h-14" style={{ color: "#006341" }} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-secondary mb-2">점검 완료!</h2>
                  <p className="text-muted-foreground">
                    <strong className="text-secondary">{branch} {selectedZone}</strong> 청소 점검이 저장되었습니다.
                  </p>
                  {issueCount > 0 && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-2.5">
                      <AlertCircle className="w-5 h-5 text-primary" />
                      <span className="text-primary font-bold">문제 {issueCount}건 기록됨</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col w-full gap-3 pt-2">
                  <button
                    onClick={() => { setStep("zone"); setSelectedZone(""); setItemData({}); }}
                    className="w-full py-5 rounded-2xl text-white font-black text-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    style={{ background: "#006341" }}
                    data-testid="btn-another-zone"
                  >
                    <Droplets className="w-5 h-5" />
                    다른 구역 점검하기
                  </button>
                  <button
                    onClick={() => setLocation("/")}
                    className="w-full py-5 rounded-2xl border-2 border-border bg-white text-secondary font-bold text-lg active:scale-[0.98] transition-all"
                    data-testid="btn-go-home"
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
