import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useCleaningInspections } from "@/hooks/use-cleaning";
import { useAdminStatus } from "@/hooks/use-guides";
import { calcCleaningScore } from "@/lib/scoring";

// Browser-generated PDF: this page renders a print-optimised report and the admin
// uses the browser's own "Save as PDF" via window.print(). No PDF library, no
// canvas, no image CORS issue — <img> tags load cross-origin fine and the print
// engine embeds them at full quality and handles page breaks itself.

const ZONES = ["공통", "농산", "축산", "수산", "공산"];

// Monday-start "N주차" weeks of a month — week 1 is the Mon–Sun week containing the 1st
// (may start in the previous month), matching the convention used across the app.
function getMondayOfWeek(d: Date) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}
function getWeekRangesInMonth(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const ranges: { start: Date; end: Date }[] = [];
  let cur = getMondayOfWeek(first);
  while (cur <= last) {
    const start = new Date(cur);
    const end = new Date(cur);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    ranges.push({ start, end });
    cur = new Date(cur);
    cur.setDate(cur.getDate() + 7);
  }
  return ranges;
}

type PhotoEntry = { url: string; hash?: string; at?: string };

type ItemData = {
  status?: string | null;
  memo?: string | null;
  photoUrl?: string | null;
  beforePhotos?: PhotoEntry[];
  afterPhotos?: PhotoEntry[];
  beforePhotoUrl?: string | null;
  beforePhotoAt?: string | null;
  afterPhotoUrl?: string | null;
  afterPhotoAt?: string | null;
};

// Cleaning items can hold multiple before/after photos (beforePhotos/afterPhotos);
// records saved before that supported only one each (beforePhotoUrl/afterPhotoUrl, or
// legacy photoUrl for "before"). This reads either shape as a uniform array.
function getPhotos(data: ItemData, slot: "before" | "after"): PhotoEntry[] {
  const arr = slot === "before" ? data.beforePhotos : data.afterPhotos;
  if (arr && arr.length > 0) return arr;
  if (slot === "before") {
    const url = data.beforePhotoUrl ?? data.photoUrl;
    return url ? [{ url, at: data.beforePhotoAt ?? undefined }] : [];
  }
  return data.afterPhotoUrl ? [{ url: data.afterPhotoUrl, at: data.afterPhotoAt ?? undefined }] : [];
}

export default function CleaningReport() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const now = new Date();

  const { data: adminStatus, isLoading: authLoading } = useAdminStatus();
  useEffect(() => {
    if (!authLoading && !adminStatus?.isAdmin) setLocation("/admin/login");
  }, [authLoading, adminStatus?.isAdmin, setLocation]);

  const { data: records = [], isLoading } = useCleaningInspections();

  const allBranches = useMemo(
    () => [...new Set((records as any[]).map(r => r.branch))].sort(),
    [records],
  );

  const [branch, setBranch] = useState(params.get("branch") || "전체");
  const [year, setYear] = useState(Number(params.get("year")) || now.getFullYear());
  const [month, setMonth] = useState(Number(params.get("month")) || now.getMonth() + 1);

  const periodStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const filtered = useMemo(() => {
    return (records as any[])
      .filter(r => branch === "전체" || r.branch === branch)
      .filter(r => {
        const d = new Date(r.createdAt);
        return d >= periodStart && d <= periodEnd;
      })
      .sort((a, b) => {
        if (a.branch !== b.branch) return a.branch.localeCompare(b.branch);
        const za = ZONES.indexOf(a.zone), zb = ZONES.indexOf(b.zone);
        if (za !== zb) return za - zb;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [records, branch, year, month]);

  // Per-week progress + score summary for the selected branch + month.
  const weeklySummary = useMemo(() => {
    const ranges = getWeekRangesInMonth(year, month);
    const inRange = (records as any[])
      .filter(r => branch === "전체" || r.branch === branch)
      .filter(r => Object.keys((r.items as Record<string, unknown>) || {}).length > 0);
    const zoneUnit = branch === "전체" ? Math.max(allBranches.length, 1) * ZONES.length : ZONES.length;
    const rows = ranges.map((rg, i) => {
      const wk = inRange.filter(r => {
        const d = new Date(r.createdAt);
        return d >= rg.start && d <= rg.end;
      });
      const doneZones = new Set(wk.map(r => `${r.branch}/${r.zone}`)).size;
      const scores = wk.map(r => calcCleaningScore((r.items as any) || {}));
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      return {
        label: `${i + 1}주차`,
        range: `${rg.start.getMonth() + 1}/${rg.start.getDate()}~${rg.end.getMonth() + 1}/${rg.end.getDate()}`,
        doneZones,
        zoneUnit,
        rate: Math.round((doneZones / zoneUnit) * 100),
        avg,
      };
    });
    const allScores = inRange
      .filter(r => { const d = new Date(r.createdAt); return d >= periodStart && d <= periodEnd; })
      .map(r => calcCleaningScore((r.items as any) || {}));
    const monthAvg = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;
    return { rows, monthAvg };
  }, [records, branch, year, month, allBranches.length]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1);
  };

  if (authLoading || !adminStatus?.isAdmin || isLoading) {
    return <div style={{ padding: 40, fontSize: 14 }}>불러오는 중...</div>;
  }

  return (
    <div className="report-root">
      <style>{`
        .report-root { background: #fff; color: #111; max-width: 900px; margin: 0 auto; padding: 24px; font-size: 13px; }
        .report-toolbar { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #ddd; padding: 12px 0; margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; z-index: 10; }
        .report-toolbar select, .report-toolbar button { font-size: 13px; padding: 8px 12px; border: 1px solid #ccc; border-radius: 8px; background: #fff; font-weight: 700; }
        .report-toolbar .print-btn { background: #006341; color: #fff; border-color: #006341; cursor: pointer; }
        .report-title { font-size: 20px; font-weight: 900; margin: 0 0 4px; }
        .report-sub { color: #666; margin: 0 0 20px; }
        .record { border: 1px solid #ccc; border-radius: 10px; padding: 14px; margin-bottom: 14px; }
        .record-head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 10px; }
        .record-head strong { font-size: 15px; }
        .record-head .meta { color: #666; font-size: 12px; }
        .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; margin-left: 6px; }
        .badge-ok { background: #d1fae5; color: #065f46; }
        .badge-issue { background: #fee2e2; color: #991b1b; }
        .item { padding: 8px 0; border-top: 1px solid #f0f0f0; }
        .item:first-child { border-top: none; }
        .item-name { font-weight: 700; }
        .item-memo { color: #b91c1c; font-size: 12px; margin-top: 2px; }
        .photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
        .photo { width: 220px; }
        .photo img { width: 100%; height: 165px; object-fit: cover; border: 1px solid #ddd; border-radius: 8px; display: block; }
        .photo span { font-size: 10px; color: #888; }
        .empty { color: #888; padding: 40px 0; text-align: center; }
        .summary { border: 1px solid #ccc; border-radius: 10px; padding: 14px; margin-bottom: 20px; break-inside: avoid; }
        .summary h2 { font-size: 14px; font-weight: 800; margin: 0 0 10px; }
        .summary table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .summary th, .summary td { border: 1px solid #e2e2e2; padding: 6px 8px; text-align: center; }
        .summary th { background: #f5f5f5; font-weight: 700; }
        .summary tfoot td { font-weight: 800; background: #fafafa; }
        @media print {
          .report-toolbar { display: none !important; }
          .report-root { max-width: none; padding: 0; }
          .record, .summary { break-inside: avoid; }
          .photo { width: 46%; }
          .photo img { height: auto; max-height: 320px; }
        }
      `}</style>

      <div className="report-toolbar no-print">
        <select value={branch} onChange={e => setBranch(e.target.value)}>
          <option value="전체">전체 지점</option>
          {allBranches.map(b => <option key={b} value={b}>{b}점</option>)}
        </select>
        <button type="button" onClick={prevMonth}>◀</button>
        <span style={{ fontWeight: 800 }}>{year}년 {month}월</span>
        <button type="button" onClick={nextMonth}>▶</button>
        <button type="button" className="print-btn" onClick={() => window.print()}>
          PDF로 저장 / 인쇄
        </button>
        <span style={{ color: "#888", fontSize: 12 }}>총 {filtered.length}건</span>
      </div>

      <h1 className="report-title">
        청소 점검 내역 · {branch === "전체" ? "전체 지점" : `${branch}점`}
      </h1>
      <p className="report-sub">
        {year}년 {month}월 · 총 {filtered.length}건 · 출력 {format(now, "yyyy-MM-dd HH:mm", { locale: ko })}
      </p>

      <div className="summary">
        <h2>주차별 진행률 · 점수</h2>
        <table>
          <thead>
            <tr><th>주차</th><th>기간</th><th>점검 완료</th><th>진행률</th><th>평균 점수</th></tr>
          </thead>
          <tbody>
            {weeklySummary.rows.map(w => (
              <tr key={w.label}>
                <td>{w.label}</td>
                <td>{w.range}</td>
                <td>{w.doneZones} / {w.zoneUnit} 구역</td>
                <td>{w.rate}%</td>
                <td>{w.avg === null ? "-" : `${w.avg}점`}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>{month}월 평균 점수</td>
              <td>{weeklySummary.monthAvg === null ? "-" : `${weeklySummary.monthAvg}점`}</td>
            </tr>
          </tfoot>
        </table>
        {branch === "전체" && (
          <p style={{ fontSize: 11, color: "#888", margin: "8px 0 0" }}>
            ※ 전체 지점 기준 진행률은 (완료 구역 수) ÷ (지점 수 × 5구역)로 계산됩니다.
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">{year}년 {month}월 청소 점검 기록이 없습니다.</div>
      ) : (
        filtered.map((r: any) => {
          const items = (r.items as Record<string, ItemData>) || {};
          const score = Object.keys(items).length > 0 ? calcCleaningScore(items as any) : null;
          const isOk = r.overallStatus === "ok";
          return (
            <div className="record" key={r.id}>
              <div className="record-head">
                <strong>
                  {r.branch}점 · {r.zone}
                  <span className={`badge ${isOk ? "badge-ok" : "badge-issue"}`}>{isOk ? "정상" : "문제"}</span>
                  {score !== null && <span className="badge" style={{ background: "#eef2ff", color: "#3730a3" }}>{score}점</span>}
                </strong>
                <span className="meta">
                  {r.inspectionTime} · {format(new Date(r.createdAt), "M월 d일 HH:mm", { locale: ko })}
                  {r.staffName ? ` · ${r.staffName}님` : ""}
                </span>
              </div>
              {Object.entries(items).map(([name, v]) => {
                const before = getPhotos(v, "before");
                const after = getPhotos(v, "after");
                return (
                  <div className="item" key={name}>
                    <div>
                      <span className="item-name">{name}</span>
                      <span className={`badge ${v.status === "issue" ? "badge-issue" : "badge-ok"}`}>
                        {v.status === "issue" ? "문제" : "정상"}
                      </span>
                    </div>
                    {v.memo && <div className="item-memo">{v.memo}</div>}
                    {(before.length > 0 || after.length > 0) && (
                      <div className="photos">
                        {before.map((p, i) => (
                          <div className="photo" key={`before-${i}`}>
                            <img src={p.url} alt={`${name} 청소 전 ${i + 1}`} />
                            <span>청소 전{p.at ? ` · ${format(new Date(p.at), "HH:mm")}` : ""}</span>
                          </div>
                        ))}
                        {after.map((p, i) => (
                          <div className="photo" key={`after-${i}`}>
                            <img src={p.url} alt={`${name} 청소 후 ${i + 1}`} />
                            <span>청소 후{p.at ? ` · ${format(new Date(p.at), "HH:mm")}` : ""}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}
