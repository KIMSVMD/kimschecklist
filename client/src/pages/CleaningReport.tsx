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

type ItemData = {
  status?: string | null;
  memo?: string | null;
  photoUrl?: string | null;
  beforePhotoUrl?: string | null;
  beforePhotoAt?: string | null;
  afterPhotoUrl?: string | null;
  afterPhotoAt?: string | null;
};

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
        .photos { display: flex; gap: 8px; margin-top: 6px; }
        .photo { width: 220px; }
        .photo img { width: 100%; height: 165px; object-fit: cover; border: 1px solid #ddd; border-radius: 8px; display: block; }
        .photo span { font-size: 10px; color: #888; }
        .empty { color: #888; padding: 40px 0; text-align: center; }
        @media print {
          .report-toolbar { display: none !important; }
          .report-root { max-width: none; padding: 0; }
          .record { break-inside: avoid; }
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
                const before = v.beforePhotoUrl ?? v.photoUrl ?? null;
                const after = v.afterPhotoUrl ?? null;
                return (
                  <div className="item" key={name}>
                    <div>
                      <span className="item-name">{name}</span>
                      <span className={`badge ${v.status === "issue" ? "badge-issue" : "badge-ok"}`}>
                        {v.status === "issue" ? "문제" : "정상"}
                      </span>
                    </div>
                    {v.memo && <div className="item-memo">{v.memo}</div>}
                    {(before || after) && (
                      <div className="photos">
                        {before && (
                          <div className="photo">
                            <img src={before} alt={`${name} 청소 전`} />
                            <span>청소 전{v.beforePhotoAt ? ` · ${format(new Date(v.beforePhotoAt), "HH:mm")}` : ""}</span>
                          </div>
                        )}
                        {after && (
                          <div className="photo">
                            <img src={after} alt={`${name} 청소 후`} />
                            <span>청소 후{v.afterPhotoAt ? ` · ${format(new Date(v.afterPhotoAt), "HH:mm")}` : ""}</span>
                          </div>
                        )}
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
