import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { useChecklists, useDeleteChecklist } from "@/hooks/use-checklists";
import { useValidGuideProducts } from "@/hooks/use-guides";
import { useCleaningInspections, useDeleteCleaning } from "@/hooks/use-cleaning";
import { CleaningCommentThread } from "@/components/CleaningCommentThread";
import { PhotoThumbnail } from "@/components/PhotoLightbox";
import { VMCommentThread } from "@/components/VMCommentThread";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  ClipboardList, Image as ImageIcon, AlertCircle, Pencil, Trash2, MapPin,
  CheckCheck, Droplets, Sun, Moon, XCircle,
  ChevronLeft, ChevronRight, Calendar, Bell, X, MessageCircle, Star, Trophy,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { calcCleaningScore, scoreColor, getGrade, gradeColor } from "@/lib/scoring";
import { useStaffNotifications, useGuideNotifications, type StaffNotification } from "@/hooks/use-notifications";

const REGIONS: Record<string, string[]> = {
  '대형점': ['강남', '강서', '야탑', '불광', '송파', '부천', '평촌', '분당', '신구로'],
  '중형점': ['구의', '유성', '일산', '수성', '광명', '쇼핑', '해운대', '산본', '동수원', '괴정'],
  '소형점': ['부산대', '인천', '고잔', '중계', '김포', '청주'],
};
const CATEGORIES = ['전체', '농산', '수산', '축산', '공산'];
const ZONES = ['입구', '농산', '수산', '축산', '공산'];

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function StaffDashboard() {
  const todayStr = toLocalDateStr(new Date());

  const [filterBranch, setFilterBranch] = useState('');
  const [filterCategory, setFilterCategory] = useState('전체');
  const [activeTab, setActiveTab] = useState<'vm' | 'quality' | 'cleaning'>('vm');
  const nowDate = new Date();
  const [vmFilterYear, setVmFilterYear] = useState(nowDate.getFullYear());
  const [vmFilterMonth, setVmFilterMonth] = useState(nowDate.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [filterTime, setFilterTime] = useState<'전체' | '오픈' | '마감'>('전체');
  const [filterZone, setFilterZone] = useState('전체');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'comment_reply' | 'score_change' | 'guide_update'>('comment_reply');
  const { toast } = useToast();
  const { notifications, unreadCount, dismiss, dismissAll, staffNotifKey } = useStaffNotifications(filterBranch);
  const { notifications: guideNotifs, unreadCount: guideUnread, dismiss: dismissGuide, dismissAll: dismissAllGuide } = useGuideNotifications();

  const commentReplies = notifications.filter(n => n.notifCategory === 'comment_reply');
  const scoreChanges = notifications.filter(n => n.notifCategory === 'score_change');
  const commentUnread = commentReplies.length;
  const scoreUnread = scoreChanges.length;

  // 탭별 가이드 알람 카운트 (탭 버튼 dot 표시용)
  const vmGuideNotifCount = guideNotifs.filter(n => !n.guideType || n.guideType !== 'quality').length;
  const qualityGuideNotifCount = guideNotifs.filter(n => n.guideType === 'quality').length;

  // 현재 탭에 맞는 가이드 알람만 필터링
  const tabGuideNotifs = guideNotifs.filter(n => {
    if (!n.guideType) return true; // guideType 없는 오래된 알람은 모두 표시
    if (activeTab === 'quality') return n.guideType === 'quality';
    return n.guideType !== 'quality'; // vm 탭 (진열 + 광고)
  });
  const tabGuideUnread = tabGuideNotifs.length;

  const catBadge = (cat: string) => {
    if (!cat || cat === '전체') return 0;
    return [...commentReplies, ...scoreChanges].filter(n => {
      const isVmType = n.type?.startsWith('vm');
      const tabMatch = (activeTab === 'vm' || activeTab === 'quality') ? isVmType : !isVmType;
      const catField = isVmType ? n.category : n.zone;
      return tabMatch && catField === cat;
    }).length;
  };

  const dismissCategoryNotifs = (cat: string) => {
    if (!cat || cat === '전체') return;
    [...commentReplies, ...scoreChanges].filter(n => {
      const isVmType = n.type?.startsWith('vm');
      const tabMatch = (activeTab === 'vm' || activeTab === 'quality') ? isVmType : !isVmType;
      const catField = isVmType ? n.category : n.zone;
      return tabMatch && catField === cat;
    }).forEach(n => dismiss(staffNotifKey(n)));
  };

  const isToday = selectedDate === todayStr;
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');

  const prevVmMonth = () => {
    if (vmFilterMonth === 1) { setVmFilterYear(y => y - 1); setVmFilterMonth(12); }
    else { setVmFilterMonth(m => m - 1); }
  };
  const nextVmMonth = () => {
    if (vmFilterMonth === 12) { setVmFilterYear(y => y + 1); setVmFilterMonth(1); }
    else { setVmFilterMonth(m => m + 1); }
  };

  const goBack = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(toLocalDateStr(d));
  };
  const goForward = () => {
    if (isToday) return;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(toLocalDateStr(d));
  };

  const deleteMutation = useDeleteChecklist();
  const deleteCleaningMutation = useDeleteCleaning();

  const { data: allVmChecklists, isLoading: vmLoading } = useChecklists({
    branch: filterBranch || undefined,
  });

  const { data: validGuideProducts = [] } = useValidGuideProducts(vmFilterYear, vmFilterMonth);

  const CATEGORY_ORDER = ['농산', '수산', '축산', '공산'];

  // 탭별 가이드 상품 세트를 미리 분리 (로딩 타이밍 무관하게 안정적 정렬)
  const vmGuideSet = useMemo(() => {
    const seasonal = new Set<string>(), regular = new Set<string>();
    validGuideProducts.filter(g => g.guideType !== 'quality').forEach(g => {
      if (g.hasDateRange) seasonal.add(g.product); else regular.add(g.product);
    });
    return { seasonal, regular };
  }, [validGuideProducts]);

  const qualityGuideSet = useMemo(() => {
    const seasonal = new Set<string>(), regular = new Set<string>();
    validGuideProducts.filter(g => g.guideType === 'quality').forEach(g => {
      if (g.hasDateRange) seasonal.add(g.product); else regular.add(g.product);
    });
    return { seasonal, regular };
  }, [validGuideProducts]);

  // Filter by year/month, checklist type, and category client-side
  const checklists = (allVmChecklists ?? []).filter(item => {
    const itemYear = (item as any).year;
    const itemMonth = (item as any).month;
    const inMonth = itemYear && itemMonth
      ? itemYear === vmFilterYear && itemMonth === vmFilterMonth
      : (() => { const d = new Date(item.createdAt); return d.getFullYear() === vmFilterYear && d.getMonth() + 1 === vmFilterMonth; })();
    const itemType = (item as any).checklistType || 'vm';
    const typeMatch = activeTab === 'quality'
      ? itemType === 'quality'
      : itemType !== 'quality'; // vm 탭: vm + ad 모두 표시 (이제 vm checklistType으로 저장됨)
    const catMatch = filterCategory === '전체' || (item as any).category === filterCategory;
    return inMonth && typeMatch && catMatch;
  }).sort((a, b) => {
    const itemTypeA = (a as any).checklistType || 'vm';
    const guideSet = itemTypeA === 'quality' ? qualityGuideSet : vmGuideSet;
    const itemTypeB = (b as any).checklistType || 'vm';
    const guideSetB = itemTypeB === 'quality' ? qualityGuideSet : vmGuideSet;
    const guidePriority = (product: string, gs: typeof vmGuideSet) => {
      if (gs.seasonal.has(product)) return 0;
      if (gs.regular.has(product)) return 1;
      return 2;
    };
    const pA = guidePriority((a as any).product, guideSet);
    const pB = guidePriority((b as any).product, guideSetB);
    if (pA !== pB) return pA - pB;
    if (!filterBranch && filterCategory === '전체') {
      const oA = CATEGORY_ORDER.indexOf((a as any).category);
      const oB = CATEGORY_ORDER.indexOf((b as any).category);
      if (oA !== oB) return oA - oB;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // 농산 기준 월별 순위 계산
  const agriPeriod = (allVmChecklists ?? []).filter(item => {
    const cat = (item as any).category as string;
    if (cat !== '농산') return false;
    const itemYear = (item as any).year;
    const itemMonth = (item as any).month;
    if (itemYear && itemMonth) return itemYear === vmFilterYear && itemMonth === vmFilterMonth;
    const d = new Date(item.createdAt);
    return d.getFullYear() === vmFilterYear && d.getMonth() + 1 === vmFilterMonth;
  });

  const ALL_BRANCHES = Object.values(REGIONS).flat();

  const buildRanking = (getScore: (item: any) => number | null) => {
    const scored: Record<string, number[]> = {};
    const pending = new Set<string>();
    agriPeriod.forEach(item => {
      const br = (item as any).branch as string;
      if (!br) return;
      const score = getScore(item);
      if (score != null) {
        (scored[br] = scored[br] ?? []).push(score);
        pending.delete(br);
      } else if (!scored[br]) {
        pending.add(br);
      }
    });
    const scoredList = Object.entries(scored)
      .map(([branch, scores]) => ({ branch, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) as number | null, status: 'scored' as const, count: scores.length }))
      .sort((a, b) => (b.avg as number) - (a.avg as number));
    const pendingList = [...pending].map(branch => ({ branch, avg: null as number | null, status: 'pending' as const, count: 0 }));
    const scoredSet = new Set(Object.keys(scored));
    const noneList = ALL_BRANCHES
      .filter(br => !scoredSet.has(br) && !pending.has(br))
      .map(branch => ({ branch, avg: null as number | null, status: 'none' as const, count: 0 }));
    return [...scoredList, ...pendingList, ...noneList];
  };

  const vmRanking = buildRanking(item => (item as any).adminScore as number | null);
  const qualityRanking = buildRanking(item => (item as any).qualityAdminScore as number | null);

  const { data: cleaningRecords = [], isLoading: cleaningLoading } = useCleaningInspections(
    filterBranch ? { branch: filterBranch } : {}
  );

  const handleDeleteVM = async (id: number, label: string) => {
    if (!confirm(`"${label}" 점검 기록을 삭제하시겠습니까?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "삭제 완료" });
    } catch {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  };

  const handleNotifNavigate = (n: StaffNotification) => {
    const key = staffNotifKey(n);
    dismiss(key);
    setNotifOpen(false);
    const isVm = n.type === 'vm_comment' || n.type === 'vm_reply' || n.type === 'vm_score';
    setActiveTab(isVm ? 'vm' : 'cleaning');
    const cardId = isVm ? `staff-vm-card-${n.checklistId}` : `staff-cleaning-card-${n.cleaningId}`;
    const scrollToCard = () => {
      const el = document.getElementById(cardId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2500);
        return true;
      }
      return false;
    };
    setTimeout(() => { if (!scrollToCard()) setTimeout(scrollToCard, 400); }, 300);
  };

  const handleDeleteCleaning = async (id: number) => {
    if (!confirm("이 청소 점검 기록을 삭제하시겠습니까?")) return;
    try {
      await deleteCleaningMutation.mutateAsync(id);
      toast({ title: "삭제 완료" });
    } catch {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  };

  const statusColors = {
    excellent: 'bg-blue-100 text-blue-700',
    average: 'bg-amber-100 text-amber-700',
    poor: 'bg-red-100 text-primary font-bold',
  };
  const statusLabels = { excellent: '우수', average: '보통', poor: '미흡' };

  // ── Cleaning stats for summary card ──
  const relevantTimes = filterTime === '전체' ? ['오픈', '마감'] : [filterTime];
  const relevantZones = filterZone === '전체' ? ZONES : [filterZone];
  const totalSlots = relevantZones.length * relevantTimes.length;

  const slotMap = useMemo(() => {
    const map: Record<string, typeof cleaningRecords[0] | null> = {};
    relevantZones.forEach(z => relevantTimes.forEach(t => { map[`${z}_${t}`] = null; }));
    cleaningRecords
      .filter(r => toLocalDateStr(new Date(r.createdAt)) === selectedDate)
      .forEach(r => {
        const key = `${r.zone}_${r.inspectionTime}`;
        if (key in map) {
          if (!map[key] || new Date(r.createdAt) > new Date(map[key]!.createdAt)) {
            map[key] = r;
          }
        }
      });
    return map;
  }, [cleaningRecords, selectedDate, filterTime, filterZone]);

  let completionScore = 0;
  let completedSlotCount = 0;
  const allIssues: { zone: string; item: string; time: string }[] = [];
  Object.values(slotMap).forEach(record => {
    if (record) {
      completedSlotCount++;
      const items = record.items as Record<string, { status: string }> || {};
      const total = Object.keys(items).length;
      const issueCount = Object.values(items).filter((v: any) => v.status === 'issue').length;
      completionScore += total > 0 ? (total - issueCount) / total : 1;
    }
  });
  const completionRate = totalSlots > 0 ? Math.round((completionScore / totalSlots) * 100) : 0;

  cleaningRecords
    .filter(r => toLocalDateStr(new Date(r.createdAt)) === selectedDate)
    .filter(r => filterTime === '전체' || r.inspectionTime === filterTime)
    .filter(r => filterZone === '전체' || r.zone === filterZone)
    .forEach(r => {
      if (r.items) {
        Object.entries(r.items as Record<string, any>).forEach(([item, data]) => {
          if (data.status === 'issue') allIssues.push({ zone: r.zone, item, time: r.inspectionTime });
        });
      }
    });

  // Zone status grid (latest per zone for selected date, no time filter for grid display)
  const zoneStatus: Record<string, 'ok' | 'issue' | null> = {};
  ZONES.forEach(z => { zoneStatus[z] = null; });
  cleaningRecords
    .filter(r => toLocalDateStr(new Date(r.createdAt)) === selectedDate)
    .forEach(r => {
      if (zoneStatus[r.zone] === null || r.overallStatus === 'issue') {
        zoneStatus[r.zone] = r.overallStatus as 'ok' | 'issue';
      }
    });

  // Filtered list shown in card list
  const dayFilteredRecords = cleaningRecords
    .filter(r => toLocalDateStr(new Date(r.createdAt)) === selectedDate)
    .filter(r => filterTime === '전체' || r.inspectionTime === filterTime)
    .filter(r => filterZone === '전체' || r.zone === filterZone);

  return (
    <Layout title="점검 월별 피드백" showBack={true}>
      <div className="flex flex-col h-full bg-white">

        {/* Filter header */}
        <div className="sticky top-0 z-40 bg-white border-b border-border/50 px-4 pt-4 space-y-0">
          {/* Branch selector + notification bell */}
          <div className="flex items-center gap-2 pb-3">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={filterBranch}
              onChange={e => { setFilterBranch(e.target.value); setNotifOpen(false); }}
              className="flex-1 bg-white border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 text-foreground"
              style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: 600, letterSpacing: '-0.02em' }}
              data-testid="select-staff-branch"
            >
              <option value="">지점 선택</option>
              <optgroup label="대형점">
                {REGIONS['대형점'].map(b => <option key={b} value={b}>{b}점</option>)}
              </optgroup>
              <optgroup label="중형점">
                {REGIONS['중형점'].map(b => <option key={b} value={b}>{b}점</option>)}
              </optgroup>
              <optgroup label="소형점">
                {REGIONS['소형점'].map(b => <option key={b} value={b}>{b}점</option>)}
              </optgroup>
            </select>
            {filterBranch && (
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="relative w-12 h-12 rounded-2xl bg-muted flex items-center justify-center shrink-0 active:scale-95 transition-all"
                data-testid="btn-staff-notif-bell"
              >
                <Bell className={`w-5 h-5 ${(commentUnread + scoreUnread + tabGuideUnread) > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                {(commentUnread + scoreUnread + tabGuideUnread) > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                    {(commentUnread + scoreUnread + tabGuideUnread) > 9 ? '9+' : (commentUnread + scoreUnread + tabGuideUnread)}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Tab switcher — underline style */}
          <div className="flex -mx-4 px-4 border-b border-border">
            <button
              onClick={() => { setActiveTab('vm'); setFilterCategory('전체'); }}
              className={`relative flex-1 flex items-center justify-center gap-1.5 pb-3 pt-1 text-sm transition-all border-b-2 -mb-px ${
                activeTab === 'vm' ? 'border-black text-black' : 'border-transparent text-muted-foreground'
              }`}
              style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: activeTab === 'vm' ? 700 : 500 }}
              data-testid="tab-staff-vm"
            >
              진열(+광고)
              {vmGuideNotifCount > 0 && <span className="absolute top-0.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />}
            </button>
            <button
              onClick={() => { setActiveTab('quality'); setFilterCategory('전체'); }}
              className={`relative flex-1 flex items-center justify-center gap-1.5 pb-3 pt-1 text-sm transition-all border-b-2 -mb-px ${
                activeTab === 'quality' ? 'border-black text-black' : 'border-transparent text-muted-foreground'
              }`}
              style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: activeTab === 'quality' ? 700 : 500 }}
              data-testid="tab-staff-quality"
            >
              품질
              {qualityGuideNotifCount > 0 && <span className="absolute top-0.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />}
            </button>
            <button
              onClick={() => { setActiveTab('cleaning'); setFilterCategory('전체'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 pb-3 pt-1 text-sm transition-all border-b-2 -mb-px ${
                activeTab === 'cleaning' ? 'border-black text-black' : 'border-transparent text-muted-foreground'
              }`}
              style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: activeTab === 'cleaning' ? 700 : 500 }}
              data-testid="tab-staff-cleaning"
            >
              <Droplets className="w-3.5 h-3.5" /> 청소
            </button>
          </div>

          {/* Year/Month filter — VM / Quality tabs */}
          {(activeTab === 'vm' || activeTab === 'quality') && (
            <div className="space-y-3 pt-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground whitespace-nowrap" style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: 600 }}>{vmFilterYear}년</span>
                </div>
                <div className="flex items-center gap-3 border border-border rounded-lg px-3 py-2 flex-1 justify-between">
                  <button onClick={prevVmMonth} className="active:scale-95 transition-all" data-testid="btn-staff-prev-month">
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <span className="text-sm text-foreground" style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: 600 }}>{vmFilterMonth}월</span>
                  <button onClick={nextVmMonth} className="active:scale-95 transition-all" data-testid="btn-staff-next-month">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              {/* category chips — black filled active, white bordered inactive */}
              <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar pb-3 touch-pan-x">
                {CATEGORIES.map(cat => {
                  const badge = catBadge(cat);
                  return (
                    <button key={cat}
                      onClick={() => { setFilterCategory(cat); dismissCategoryNotifs(cat); }}
                      className={`relative shrink-0 px-4 py-1.5 rounded-full text-sm transition-all active:scale-95 ${
                        filterCategory === cat
                          ? 'bg-black text-white'
                          : 'bg-white border border-border text-secondary hover:border-black/40'
                      }`}
                      style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: filterCategory === cat ? 700 : 500 }}
                      data-testid={`btn-staff-cat-${cat}`}>
                      {cat}
                      {badge > 0 && (
                        <span className="absolute -top-2 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 leading-none shadow-sm">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date navigator + time filter — cleaning tab */}
          {activeTab === 'cleaning' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-muted rounded-2xl p-1 flex-1">
                <button
                  onClick={goBack}
                  className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-95 transition-all"
                  data-testid="btn-staff-date-prev"
                >
                  <ChevronLeft className="w-5 h-5 text-secondary" />
                </button>
                <div className="flex-1 text-center">
                  <p className="font-black text-secondary text-sm whitespace-nowrap">
                    {isToday ? '오늘 · ' : ''}{format(selectedDateObj, 'M월 d일 (EEE)', { locale: ko })}
                  </p>
                </div>
                <button
                  onClick={goForward}
                  disabled={isToday}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed bg-white shadow-sm"
                  data-testid="btn-staff-date-next"
                >
                  <ChevronRight className="w-5 h-5 text-secondary" />
                </button>
              </div>
              {/* 오픈 / 마감 toggle */}
              <div className="flex bg-muted rounded-2xl p-1 gap-0.5 shrink-0">
                {(['전체', '오픈', '마감'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterTime(t)}
                    className={`flex items-center gap-0.5 px-2 py-2 rounded-xl text-xs font-bold transition-all ${
                      filterTime === t
                        ? t === '오픈' ? 'bg-amber-400 text-white shadow-sm'
                          : t === '마감' ? 'bg-secondary text-white shadow-sm'
                          : 'bg-white text-secondary shadow-sm'
                        : 'text-muted-foreground hover:text-secondary'
                    }`}
                    data-testid={`btn-staff-filter-time-${t}`}
                  >
                    {t === '오픈' && <Sun className="w-3 h-3" />}
                    {t === '마감' && <Moon className="w-3 h-3" />}
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Zone filter — cleaning tab */}
          {activeTab === 'cleaning' && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <button
                onClick={() => setFilterZone('전체')}
                className={`shrink-0 px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                  filterZone === '전체' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-muted text-muted-foreground'
                }`}
                data-testid="btn-staff-zone-전체"
              >
                전체
              </button>
              {ZONES.map(z => (
                <button
                  key={z}
                  onClick={() => setFilterZone(z)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                    filterZone === z ? 'bg-emerald-500 text-white shadow-sm' : 'bg-muted text-muted-foreground'
                  }`}
                  data-testid={`btn-staff-zone-${z}`}
                >
                  {z}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Staff Notification Panel */}
        {notifOpen && filterBranch && (
          <div className="sticky top-0 z-50 bg-white border-b border-border/50 shadow-xl max-h-[65vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <span className="font-black text-secondary text-base">{filterBranch}점 알림</span>
              </div>
              <div className="flex items-center gap-2">
                {(unreadCount + tabGuideUnread) > 0 && (
                  <button onClick={() => { dismissAll(); dismissAllGuide(); }} className="text-xs font-bold text-muted-foreground px-2 py-1 rounded-lg hover:bg-muted transition-all" data-testid="btn-staff-notif-dismiss-all">
                    모두 읽음
                  </button>
                )}
                <button onClick={() => setNotifOpen(false)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center" data-testid="btn-staff-notif-close">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            {/* Tab switcher */}
            <div className="flex gap-0 border-b border-border/30 shrink-0">
              {([
                { key: 'comment_reply' as const, label: '코멘트/답글', count: commentUnread },
                { key: 'score_change' as const, label: '점수 부여', count: scoreUnread },
                { key: 'guide_update' as const, label: '새 가이드', count: tabGuideUnread },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setNotifTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold border-b-2 transition-all ${
                    notifTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                  }`}
                  data-testid={`btn-staff-notif-tab-${tab.key}`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${notifTab === tab.key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {/* Notification list */}
            <div className="overflow-y-auto flex-1">
              {notifTab === 'guide_update' ? (
                tabGuideNotifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground space-y-2">
                    <Bell className="w-10 h-10 opacity-20" />
                    <p className="font-medium text-sm">새 가이드 알림이 없습니다</p>
                  </div>
                ) : (
                  tabGuideNotifs.map(n => (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 p-4 border-b border-border/30"
                      data-testid={`staff-notif-guide-${n.id}`}
                    >
                      <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 bg-blue-50">
                        <ClipboardList className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-muted-foreground mb-0.5">
                          {n.category ? `${n.category} · ` : ''}{n.product ?? n.itemName}
                          {' · '}{n.newStatus === 'new_guide' ? '새 가이드 등록' : '가이드 업데이트'}
                        </p>
                        <p className="text-sm font-medium text-secondary">새로운 점검을 등록해주세요</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{format(new Date(n.createdAt), 'M월 d일 HH:mm', { locale: ko })}</p>
                      </div>
                      <button
                        onClick={() => dismissGuide(n)}
                        className="shrink-0 w-7 h-7 rounded-lg bg-muted flex items-center justify-center active:scale-95 transition-all"
                        data-testid={`btn-guide-notif-dismiss-${n.id}`}
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  ))
                )
              ) : (() => {
                const list = notifTab === 'comment_reply' ? commentReplies : scoreChanges;
                if (list.length === 0) return (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground space-y-2">
                    <Bell className="w-10 h-10 opacity-20" />
                    <p className="font-medium text-sm">새 알림이 없습니다</p>
                  </div>
                );
                return list.map(n => {
                  const key = staffNotifKey(n);
                  const isVm = n.type === 'vm_comment' || n.type === 'vm_reply' || n.type === 'vm_score';
                  const isScore = n.notifCategory === 'score_change';

                  const statusLabel = (s?: string) => {
                    if (!s) return '';
                    if (s === 'excellent') return '우수';
                    if (s === 'average') return '보통';
                    if (s === 'poor') return '미흡';
                    if (s === 'ok') return '정상';
                    if (s === 'issue') return '문제';
                    return s;
                  };
                  const statusColor = (s?: string) => {
                    if (s === 'excellent' || s === 'ok') return 'text-blue-600 bg-blue-50';
                    if (s === 'average') return 'text-amber-600 bg-amber-50';
                    return 'text-red-600 bg-red-50';
                  };

                  return (
                    <button
                      key={key}
                      onClick={() => handleNotifNavigate(n)}
                      className="w-full flex items-start gap-3 p-4 border-b border-border/30 hover:bg-muted/40 active:bg-muted transition-all text-left"
                      data-testid={`staff-notif-${key}`}
                    >
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${isScore ? 'bg-amber-50' : isVm ? 'bg-primary/10' : 'bg-emerald-100'}`}>
                        <MessageCircle className={`w-4 h-4 ${isScore ? 'text-amber-500' : isVm ? 'text-primary' : 'text-emerald-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-muted-foreground mb-0.5">
                          {isVm ? `VM · ${n.category} · ${n.product}` : `청소 · ${n.zone} · ${n.inspectionTime}`}
                          {' · '}
                          {isScore ? '점수 부여' : n.type.includes('comment') ? '관리자 피드백' : '관리자 답글'}
                        </p>
                        {isScore ? (
                          <div className="flex items-center gap-2">
                            <span className={`text-base font-black px-3 py-1 rounded-xl border ${
                              parseInt(n.newStatus) >= 90 ? 'text-blue-600 bg-blue-50 border-blue-200' :
                              parseInt(n.newStatus) >= 70 ? 'text-amber-600 bg-amber-50 border-amber-200' :
                              'text-primary bg-red-50 border-red-200'
                            }`}>
                              ★ {n.newStatus}점
                            </span>
                            <span className="text-xs text-muted-foreground">이 확정됐습니다</span>
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-secondary leading-snug line-clamp-2">{n.content}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-1">{format(new Date(n.createdAt), 'M월 d일 HH:mm', { locale: ko })}</p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-primary/60 self-center">보기 →</span>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* No branch selected */}
        {!filterBranch ? (
          (activeTab === 'vm' || activeTab === 'quality') ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(() => {
                const rawRanking = activeTab === 'quality' ? qualityRanking : vmRanking;
                const title = activeTab === 'quality' ? '품질 월별 피드백' : '진열(+광고) 월별 피드백';
                const accentClass = activeTab === 'quality' ? 'text-purple-600' : 'text-primary';
                // Sort by grade A→B→C, then same grade: score desc, then 대형→중형→소형
                const gradeOrder = { A: 0, B: 1, C: 2 } as const;
                const storeOrder: Record<string, number> = {};
                // 대형→중형→소형, 각 그룹 내 서울→수도권→지방 순
                [
                  '강남','강서','불광','송파','신구로',
                  '야탑','부천','평촌','분당',
                  '구의',
                  '일산','광명','쇼핑','산본','동수원',
                  '유성','수성','해운대','괴정',
                  '중계',
                  '인천',,'고잔','김포',
                  '부산대','청주',
                ].forEach((b, i) => { storeOrder[b] = i; });
                const gradeList = rawRanking.filter(r => r.status === 'scored').map(r => ({ ...r, grade: getGrade(r.avg) }));
                const sortedGrade = gradeList.sort((a, b) => {
                  const ga = a.grade ?? 'C', gb = b.grade ?? 'C';
                  if (ga !== gb) return gradeOrder[ga] - gradeOrder[gb];
                  if (a.avg !== b.avg) return (b.avg as number) - (a.avg as number);
                  return (storeOrder[a.branch] ?? 99) - (storeOrder[b.branch] ?? 99);
                });
                const pendingList = [...rawRanking.filter(r => r.status === 'pending')].sort((a, b) => (storeOrder[a.branch] ?? 99) - (storeOrder[b.branch] ?? 99));
                const noneList = [...rawRanking.filter(r => r.status === 'none')].sort((a, b) => (storeOrder[a.branch] ?? 99) - (storeOrder[b.branch] ?? 99));
                const sortedRanking = [...sortedGrade, ...pendingList, ...noneList];
                return (
                  <>
                    <div className="flex items-center gap-2 pt-1 pb-2">
                      <Star className={`w-5 h-5 ${accentClass}`} />
                      <h2 className={`text-base font-black ${accentClass}`}>{vmFilterYear}년 {vmFilterMonth}월 {title}</h2>
                      <span className="text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">농산 기준</span>
                    </div>
                    {/* Grade legend inline */}
                    <div className="flex gap-1.5 items-center pb-1">
                      {(['A', 'B', 'C'] as const).map(g => (
                        <span key={g} className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${gradeColor(g)}`}>{g}</span>
                      ))}
                      <span className="text-[10px] text-muted-foreground ml-1">80/60/0 기준</span>
                    </div>
                    {sortedRanking.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Star className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-medium">이번 달 점검 제출 기록이 없습니다.</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {sortedRanking.map(({ branch, avg, count, status }) => {
                          const isScored = status === 'scored';
                          const isPending = status === 'pending';
                          const grade = getGrade(avg);
                          const gColor = gradeColor(grade);
                          const rowBg = isScored
                            ? 'bg-white border-border/40'
                            : isPending
                              ? 'bg-muted/30 border-border/20'
                              : 'bg-muted/10 border-transparent';
                          return (
                            <button
                              key={branch}
                              onClick={() => setFilterBranch(branch)}
                              className={`w-full flex items-center gap-2 px-2.5 py-1 rounded-xl border transition-all active:scale-[0.98] text-left ${rowBg}`}
                              data-testid={`btn-staff-rank-${branch}`}
                            >
                              <div className="flex-1 min-w-0">
                                <span className={`font-bold text-sm ${isScored ? 'text-secondary' : 'text-muted-foreground/50'}`}>{branch}점</span>
                              </div>
                              <div className="shrink-0">
                                {isScored && grade ? (
                                  <span className={`text-xs font-black px-1.5 py-0.5 rounded border ${gColor}`}>{grade}</span>
                                ) : isPending ? (
                                  <span className="text-[10px] font-bold text-muted-foreground">미평가</span>
                                ) : (
                                  <span className="text-[10px] font-bold text-muted-foreground/30">미점검</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-center text-xs text-muted-foreground pt-2">지점을 탭하면 해당 지점의 점검 내역을 볼 수 있습니다.</p>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground text-center space-y-3 p-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <MapPin className="w-10 h-10 text-primary/60" />
              </div>
              <p className="font-bold text-xl text-secondary">지점을 선택해주세요</p>
              <p className="text-base">청소 점검 기록을 확인할 지점을 먼저 선택하세요</p>
            </div>
          )
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 max-w-7xl mx-auto w-full">

            {/* ── VM / QUALITY TAB ── */}
            {(activeTab === 'vm' || activeTab === 'quality') && (
              vmLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                  불러오는 중...
                </div>
              ) : !checklists.length ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <ClipboardList className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="font-medium text-lg">{vmFilterYear}년 {vmFilterMonth}월 {activeTab === 'quality' ? '품질 점검' : '진열(+광고) 점검'} 기록이 없습니다</p>
                  <Link href="/checklist/new">
                    <button className="px-6 py-3 rounded-2xl bg-primary text-white font-bold text-base">
                      새 점검 등록하기
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {checklists.map((item, index) => {
                  const hasNotok = item.items && Object.values(item.items as Record<string, string>).some(v => v === 'notok');
                  const adminScore = (item as any).adminScore as number | null | undefined;
                  const adAdminScore = (item as any).adAdminScore as number | null | undefined;
                  const adminItems = (item as any).adminItems as Record<string, 'ok' | 'notok'> | null;
                  const adAdminItems = (item as any).adAdminItems as Record<string, 'ok' | 'notok'> | null;
                  const vmItemsRaw = item.items as Record<string, string> | null;
                  const adItemsRaw = (item as any).adItems as Record<string, string> | null;
                  const hasAdData = !!(adItemsRaw && Object.keys(adItemsRaw).length > 0) || !!((item as any).adNotes);

                  // 진열+광고 항목 동그라미 합산 점수
                  let combinedOk = 0, combinedTotal = 0;
                  if (adminScore != null && vmItemsRaw && Object.keys(vmItemsRaw).length > 0) {
                    const eff = adminItems
                      ? adminItems
                      : Object.fromEntries(Object.entries(vmItemsRaw).map(([k, v]) => [k, (v === 'ok' || v === 'excellent') ? 'ok' : 'notok']));
                    combinedOk += Object.values(eff).filter(v => v === 'ok').length;
                    combinedTotal += Object.keys(eff).length;
                  }
                  if (adAdminScore != null && adItemsRaw && Object.keys(adItemsRaw).length > 0) {
                    const eff = adAdminItems
                      ? adAdminItems
                      : Object.fromEntries(Object.entries(adItemsRaw).map(([k, v]) => [k, v === 'ok' ? 'ok' : 'notok']));
                    combinedOk += Object.values(eff).filter(v => v === 'ok').length;
                    combinedTotal += Object.keys(eff).length;
                  }
                  const displayScore = combinedTotal > 0
                    ? Math.round((combinedOk / combinedTotal) * 100)
                    : (adminScore ?? adAdminScore ?? null);
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      key={item.id}
                      id={`staff-vm-card-${item.id}`}
                      className={`bg-white rounded-3xl overflow-hidden shadow-lg shadow-black/5 transition-all
                        ${hasNotok ? 'border-2 border-primary' : 'border border-border/50'}`}
                      data-testid={`card-checklist-${item.id}`}
                    >
                      {(() => {
                        const photos: string[] = (item as any).photoUrls?.length ? (item as any).photoUrls : item.photoUrl ? [item.photoUrl] : [];
                        if (photos.length === 0) return (
                          <div className="w-full h-28 bg-muted/50 flex flex-col items-center justify-center text-muted-foreground border-b border-border/50">
                            <ImageIcon className="w-7 h-7 mb-1 opacity-40" />
                            <span className="text-xs font-medium">사진 없음</span>
                          </div>
                        );
                        if (photos.length === 1) return (
                          <PhotoThumbnail src={photos[0]} className="w-full h-44 bg-muted relative block">
                            <img src={photos[0]} alt="현장사진" className="w-full h-full object-cover" />
                            {hasNotok && (
                              <div className="absolute top-3 left-3 bg-primary text-white px-3 py-1 rounded-full text-sm font-bold shadow-md flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" /> 불일치 항목 있음
                              </div>
                            )}
                          </PhotoThumbnail>
                        );
                        return (
                          <div className="relative border-b border-border/50">
                            <div className="flex gap-1 overflow-x-auto no-scrollbar p-1">
                              {photos.map((url, pi) => (
                                <PhotoThumbnail key={pi} src={url} className="shrink-0 w-32 h-32 rounded-2xl overflow-hidden block">
                                  <img src={url} alt={`사진 ${pi + 1}`} className="w-full h-full object-cover" />
                                </PhotoThumbnail>
                              ))}
                            </div>
                            {hasNotok && (
                              <div className="absolute top-3 left-3 bg-primary text-white px-3 py-1 rounded-full text-sm font-bold shadow-md flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" /> 불일치 항목 있음
                              </div>
                            )}
                            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full">{photos.length}장</div>
                          </div>
                        );
                      })()}

                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{item.category}</span>
                              {(item as any).checklistType === 'ad' && (
                                <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">📢 광고점검</span>
                              )}
                            </div>
                            <h3 className="text-xl font-black text-secondary mt-1">{item.product}</h3>
                            {((item as any).year && (item as any).month) && (
                              <p className="text-xs text-primary/60 font-bold mt-0.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />{(item as any).year}년 {(item as any).month}월 점검
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            {displayScore != null ? (
                              <div className={`px-3 py-1.5 rounded-xl border text-sm font-black flex items-center gap-1 ${
                                displayScore >= 80 ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                displayScore >= 60 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                'bg-red-50 border-red-200 text-primary'
                              }`} data-testid={`text-admin-score-${item.id}`}>
                                <Star className="w-3.5 h-3.5" /> {displayScore}점
                                {hasAdData && combinedTotal > 0 && (
                                  <span className="text-[10px] font-medium opacity-70 ml-0.5">({combinedOk}/{combinedTotal})</span>
                                )}
                              </div>
                            ) : (
                              <div className="px-3 py-1.5 rounded-xl bg-muted border border-border text-xs text-muted-foreground font-medium">미평가</div>
                            )}
                          </div>
                        </div>

                        {item.items && Object.keys(item.items as object).length > 0 && (() => {
                          const adminItems = (item as any).adminItems as Record<string, 'ok' | 'notok'> | null;
                          const entries = Object.entries(item.items as Record<string, string>);
                          const changedCount = entries.filter(([name, st]) => {
                            const av = adminItems?.[name];
                            if (!av) return false;
                            const sOk = st === 'ok' || st === 'excellent';
                            return (av === 'ok') !== sOk;
                          }).length;
                          return (
                            <div className="mb-3">
                              {hasAdData && (
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="flex-1 h-px bg-primary/20" />
                                  <span className="text-[11px] font-black text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">진열 점검</span>
                                  <div className="flex-1 h-px bg-primary/20" />
                                </div>
                              )}
                              {changedCount > 0 && (
                                <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-xl bg-amber-50 border border-amber-200 w-fit">
                                  <span className="text-[10px] font-black text-amber-700">관리자 수정 {changedCount}항목</span>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1.5">
                                {entries.map(([name, st]) => {
                                  const adminVal = adminItems?.[name];
                                  const staffIsOk = st === 'ok' || st === 'excellent';
                                  const adminIsOk = adminVal === 'ok';
                                  const wasChanged = adminVal != null && adminIsOk !== staffIsOk;
                                  return (
                                    <span key={name} className={`text-[10px] px-2 py-1 rounded-full font-bold border inline-flex items-center gap-1 ${
                                      wasChanged
                                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                                        : staffIsOk ? 'bg-blue-50 border-blue-200 text-blue-600'
                                        : 'bg-red-50 border-red-200 text-red-600'
                                    }`}>
                                      {name}:&nbsp;
                                      {wasChanged ? (
                                        <>
                                          <span className="line-through opacity-50">{staffIsOk ? '○' : '✗'}</span>
                                          <span>→ {adminIsOk ? '○' : '✗'}</span>
                                          <span className="text-[9px] bg-amber-200 text-amber-800 px-1 rounded-full ml-0.5">수정</span>
                                        </>
                                      ) : (
                                        <span>{staffIsOk ? '○' : '✗'}</span>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* 진열 특이사항 — vm 항목 바로 다음 */}
                        {item.notes && (
                          <div className="mb-3 p-3 bg-muted/50 rounded-2xl text-secondary text-sm border border-border">
                            <strong className="block mb-1 text-xs text-muted-foreground">특이사항:</strong>
                            {item.notes}
                          </div>
                        )}

                        {/* 광고 섹션 */}
                        {hasAdData && (
                          <>
                            <div className="my-4 flex items-center gap-2">
                              <div className="flex-1 h-px bg-amber-200" />
                              <span className="text-[11px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">📢 광고(+셀링) 점검</span>
                              <div className="flex-1 h-px bg-amber-200" />
                            </div>
                            {adItemsRaw && Object.keys(adItemsRaw).length > 0 && (() => {
                              const adEntries = Object.entries(adItemsRaw);
                              const adChangedCount = adEntries.filter(([name, st]) => {
                                const av = adAdminItems?.[name];
                                if (!av) return false;
                                return (av === 'ok') !== (st === 'ok');
                              }).length;
                              return (
                                <div className="mb-3">
                                  {adChangedCount > 0 && (
                                    <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-xl bg-amber-50 border border-amber-200 w-fit">
                                      <span className="text-[10px] font-black text-amber-700">관리자 수정 {adChangedCount}항목</span>
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-1.5">
                                    {adEntries.map(([name, st]) => {
                                      const adminVal = adAdminItems?.[name];
                                      const staffIsOk = st === 'ok';
                                      const adminIsOk = adminVal === 'ok';
                                      const wasChanged = adminVal != null && adminIsOk !== staffIsOk;
                                      return (
                                        <span key={name} className={`text-[10px] px-2 py-1 rounded-full font-bold border inline-flex items-center gap-1 ${
                                          wasChanged ? 'bg-amber-50 border-amber-300 text-amber-700'
                                          : staffIsOk ? 'bg-amber-50 border-amber-200 text-amber-600'
                                          : 'bg-red-50 border-red-200 text-red-600'
                                        }`}>
                                          {name}:&nbsp;
                                          {wasChanged ? (
                                            <>
                                              <span className="line-through opacity-50">{staffIsOk ? '○' : '✗'}</span>
                                              <span>→ {adminIsOk ? '○' : '✗'}</span>
                                              <span className="text-[9px] bg-amber-200 text-amber-800 px-1 rounded-full ml-0.5">수정</span>
                                            </>
                                          ) : (
                                            <span>{staffIsOk ? '○' : '✗'}</span>
                                          )}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                            {/* 광고 특이사항 — 광고 항목 바로 다음 */}
                            {(item as any).adNotes && (
                              <div className="mb-3 p-3 bg-amber-50 rounded-2xl text-secondary text-sm border border-amber-200">
                                <strong className="block mb-1 text-[11px] text-amber-700 font-black">📢 광고 특이사항:</strong>
                                {(item as any).adNotes}
                              </div>
                            )}
                          </>
                        )}

                        {(item as any).qualityItems && Object.keys((item as any).qualityItems).length > 0 && (() => {
                          const qItems = (item as any).qualityItems as Record<string, string>;
                          const qAdminItems = (item as any).qualityAdminItems as Record<string, 'ok' | 'notok'> | null;
                          const qAdminScore = (item as any).qualityAdminScore as number | null | undefined;
                          const qEntries = Object.entries(qItems);
                          const qChangedCount = qEntries.filter(([name, st]) => {
                            const av = qAdminItems?.[name];
                            if (!av) return false;
                            return (av === 'ok') !== (st === 'ok');
                          }).length;
                          return (
                            <div className="mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] px-2 py-1 rounded-full font-black border bg-purple-50 border-purple-300 text-purple-700 inline-flex items-center gap-1">⭐ 품질</span>
                                {qAdminScore != null && (
                                  <span className={`text-[10px] px-2 py-1 rounded-full font-black border inline-flex items-center gap-1 ${
                                    qAdminScore >= 80 ? 'bg-purple-50 border-purple-200 text-purple-700' :
                                    qAdminScore >= 60 ? 'bg-orange-50 border-orange-200 text-orange-700' :
                                    'bg-red-50 border-red-200 text-red-600'
                                  }`}>{qAdminScore}점</span>
                                )}
                                {qChangedCount > 0 && (
                                  <span className="text-[10px] px-2 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 font-black">관리자 수정 {qChangedCount}항목</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {qEntries.map(([name, st]) => {
                                  const adminVal = qAdminItems?.[name];
                                  const staffIsOk = st === 'ok';
                                  const adminIsOk = adminVal === 'ok';
                                  const wasChanged = adminVal != null && adminIsOk !== staffIsOk;
                                  return (
                                    <span key={name} className={`text-[10px] px-2 py-1 rounded-full font-bold border inline-flex items-center gap-1 ${
                                      wasChanged ? 'bg-purple-50 border-purple-300 text-purple-700'
                                      : staffIsOk ? 'bg-purple-50 border-purple-200 text-purple-600'
                                      : 'bg-red-50 border-red-200 text-red-600'
                                    }`}>
                                      {name}:&nbsp;
                                      {wasChanged ? (
                                        <>
                                          <span className="line-through opacity-50">{staffIsOk ? '○' : '✗'}</span>
                                          <span>→ {adminIsOk ? '○' : '✗'}</span>
                                          <span className="text-[9px] bg-purple-200 text-purple-800 px-1 rounded-full ml-0.5">수정</span>
                                        </>
                                      ) : (
                                        <span>{staffIsOk ? '○' : '✗'}</span>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        <p className="text-sm text-muted-foreground mb-3">
                          {format(new Date(item.createdAt), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                        </p>

                        {(item as any).adminComment && (
                          <VMCommentThread
                            checklistId={item.id}
                            adminComment={(item as any).adminComment}
                            confirmed={(item as any).commentConfirmed}
                            isAdmin={false}
                          />
                        )}

                        <div className="flex gap-3 mt-4">
                          <Link href={`/checklist/edit/${item.id}`} className="flex-1">
                            <button
                              className="w-full py-4 rounded-2xl border-2 border-border bg-muted text-secondary font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:border-primary/40 hover:text-primary"
                              data-testid={`button-edit-staff-${item.id}`}
                            >
                              <Pencil className="w-5 h-5" /> 수정
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDeleteVM(item.id, item.product)}
                            disabled={deleteMutation.isPending}
                            className="py-4 px-5 rounded-2xl border-2 border-red-200 bg-red-50 text-red-500 font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-red-100 hover:border-red-300 disabled:opacity-50"
                            data-testid={`button-delete-staff-${item.id}`}
                          >
                            <Trash2 className="w-5 h-5" /> 삭제
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                </div>
              )
            )}

            {/* ── CLEANING TAB ── */}
            {activeTab === 'cleaning' && (
              cleaningLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mb-4" />
                  불러오는 중...
                </div>
              ) : (<>
                {/* ── 오늘의 청소 점검 현황 카드 ── */}
                <div className="bg-secondary text-white rounded-3xl p-5 shadow-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Droplets className="w-6 h-6 text-emerald-400" />
                    <h3 className="text-xl font-black">
                      {isToday ? '오늘의' : format(selectedDateObj, 'M월 d일', { locale: ko })} 청소 점검 현황
                    </h3>
                  </div>
                  <div className="flex gap-3 mb-5">
                    <div className="flex-1 bg-white/10 rounded-2xl p-3 text-center">
                      <p className="text-2xl font-black text-emerald-400">{completedSlotCount}<span className="text-sm text-white/60">/{totalSlots}</span></p>
                      <p className="text-xs text-white/70 font-medium mt-0.5">점검 완료</p>
                    </div>
                    <div className="flex-1 bg-white/10 rounded-2xl p-3 text-center">
                      <p className="text-2xl font-black text-primary">{allIssues.length}</p>
                      <p className="text-xs text-white/70 font-medium mt-0.5">문제 발생</p>
                    </div>
                    <div className="flex-1 bg-white/10 rounded-2xl p-3 text-center">
                      <p className="text-2xl font-black text-white">{completionRate}<span className="text-sm text-white/60">%</span></p>
                      <p className="text-xs text-white/70 font-medium mt-0.5">완료율</p>
                    </div>
                  </div>
                  {/* Zone status grid */}
                  <div className="grid grid-cols-5 gap-2">
                    {ZONES.map(zone => {
                      const status = zoneStatus[zone];
                      const isSelected = filterZone === zone || filterZone === '전체';
                      return (
                        <button
                          key={zone}
                          onClick={() => setFilterZone(zone === filterZone ? '전체' : zone)}
                          className={`rounded-2xl p-2 text-center transition-all active:scale-95 border-2 ${
                            status === null
                              ? 'bg-white/10 border-white/10'
                              : status === 'ok'
                                ? 'bg-emerald-500/90 border-emerald-400'
                                : 'bg-primary/80 border-primary/60'
                          } ${!isSelected ? 'opacity-40' : ''}`}
                          data-testid={`btn-staff-zone-grid-${zone}`}
                        >
                          {status === 'ok' && <CheckCheck className="w-4 h-4 text-white mx-auto mb-0.5" />}
                          {status === 'issue' && <XCircle className="w-4 h-4 text-white mx-auto mb-0.5" />}
                          {status === null && <div className="w-4 h-4 mx-auto mb-0.5" />}
                          <p className="text-xs font-black text-white">{zone}</p>
                          {status !== null && (
                            <div className="flex items-center justify-center gap-0.5 mt-0.5">
                              <Sun className="w-2.5 h-2.5 text-white/70" />
                              <span className="text-[9px] text-white/70">오픈</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Record list ── */}
                {dayFilteredRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <Calendar className="w-8 h-8 opacity-40" />
                    </div>
                    <p className="font-medium text-lg text-center">
                      {isToday ? '오늘은' : format(selectedDateObj, 'M월 d일은', { locale: ko })} 청소 점검 기록이 없습니다
                    </p>
                    {!isToday && (
                      <button onClick={() => setSelectedDate(todayStr)} className="text-sm font-bold text-emerald-600 underline underline-offset-2">
                        오늘로 돌아가기
                      </button>
                    )}
                    {isToday && (
                      <Link href={`/cleaning/new?branch=${filterBranch}`}>
                        <button className="px-6 py-3 rounded-2xl bg-emerald-500 text-white font-bold text-base">
                          청소 점검 시작하기
                        </button>
                      </Link>
                    )}
                  </div>
                ) : (
                  dayFilteredRecords.map((record, i) => {
                    const items = (record.items as Record<string, { status: string; memo?: string | null; photoUrl?: string | null }>) || {};
                    const issueItems = Object.entries(items).filter(([, v]) => v.status === 'issue');
                    const cleanScore = Object.keys(items).length > 0 ? calcCleaningScore(items) : null;
                    const isOk = record.overallStatus === 'ok';
                    return (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        id={`staff-cleaning-card-${record.id}`}
                        className={`bg-white rounded-3xl border-2 overflow-hidden shadow-lg shadow-black/5 transition-all ${
                          isOk ? 'border-emerald-200' : 'border-red-200'
                        }`}
                        data-testid={`card-cleaning-staff-${record.id}`}
                      >
                        <div className={`px-5 py-3 flex items-center justify-between ${isOk ? 'bg-emerald-50' : 'bg-red-50'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isOk ? 'bg-emerald-500' : 'bg-primary'}`}>
                              {isOk
                                ? <CheckCheck className="w-4 h-4 text-white" />
                                : <XCircle className="w-4 h-4 text-white" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-secondary text-lg">{record.zone}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOk ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-primary'}`}>
                                  {isOk ? '정상' : '문제'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                {record.inspectionTime === '오픈' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                                <span>{record.inspectionTime}</span>
                                <span>·</span>
                                <span>{format(new Date(record.createdAt), 'MM월 dd일 HH:mm', { locale: ko })}</span>
                              </div>
                            </div>
                          </div>
                          {cleanScore !== null && (
                            <div className={`px-2.5 py-1.5 rounded-xl border text-sm font-black ${scoreColor(cleanScore)}`}>
                              {cleanScore}점
                            </div>
                          )}
                        </div>

                        <div className="p-5 space-y-3">
                          {issueItems.length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-muted-foreground mb-2">문제 항목</p>
                              <div className="flex flex-wrap gap-1.5">
                                {issueItems.map(([name, v]) => (
                                  <div key={name} className="bg-red-50 border border-red-200 rounded-xl px-3 py-1.5 w-full">
                                    {v.photoUrl && (
                                      <PhotoThumbnail src={v.photoUrl} className="block mb-1.5">
                                        <img src={v.photoUrl} alt={name} className="w-full h-24 object-cover rounded-lg" />
                                      </PhotoThumbnail>
                                    )}
                                    <span className="text-xs font-bold text-red-600">{name}</span>
                                    {v.memo && <p className="text-[10px] text-red-400 mt-0.5">{v.memo}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <CleaningCommentThread
                            cleaningId={record.id}
                            adminComment={(record as any).adminComment}
                            confirmed={(record as any).commentConfirmed}
                            isAdmin={false}
                          />

                          <button
                            onClick={() => handleDeleteCleaning(record.id)}
                            disabled={deleteCleaningMutation.isPending}
                            className="w-full py-3 rounded-2xl border-2 border-red-200 bg-red-50 text-red-500 font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-red-100 disabled:opacity-50"
                            data-testid={`button-delete-cleaning-staff-${record.id}`}
                          >
                            <Trash2 className="w-4 h-4" /> 삭제
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </>)
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
