import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Bell, X, BarChart3, Droplets, ArrowRight, MessageSquare } from "lucide-react";
import type { AdminNotification } from "@/hooks/use-notifications";

type NavTarget = {
  type: "vm" | "cleaning";
  branch: string;
  checklistId?: number;
  cleaningId?: number;
  date?: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  notifications: AdminNotification[];
  lastSeenAt: string;
  onNavigate: (target: NavTarget) => void;
}

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function NotificationPanel({ open, onClose, notifications, lastSeenAt, onNavigate }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-50 bg-white shadow-2xl rounded-b-3xl max-h-[80vh] flex flex-col"
            style={{ maxWidth: 480, margin: "0 auto" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-secondary" />
                <h2 className="text-lg font-black text-secondary">현장 직원 알림</h2>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-all"
                data-testid="btn-notification-close"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 divide-y divide-border/40">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <MessageSquare className="w-10 h-10 opacity-30" />
                  <p className="font-medium">새 알림이 없습니다</p>
                </div>
              ) : (
                notifications.map((n, i) => {
                  const isNew = new Date(n.createdAt) > new Date(lastSeenAt);
                  const date = new Date(n.createdAt);
                  const dateStr = toLocalDateStr(date);
                  const timeAgo = formatDistanceToNow(date, { addSuffix: true, locale: ko });

                  const label = n.type === "vm"
                    ? `${n.branch}점 · VM (${n.category} / ${n.product})`
                    : `${n.branch}점 · 청소 (${n.zone} ${n.inspectionTime})`;

                  const handleGo = () => {
                    onNavigate({
                      type: n.type,
                      branch: n.branch,
                      checklistId: n.checklistId,
                      cleaningId: n.cleaningId,
                      date: dateStr,
                    });
                    onClose();
                  };

                  return (
                    <div
                      key={`${n.type}-${n.replyId}`}
                      className={`px-5 py-4 transition-colors ${isNew ? "bg-emerald-50/60" : ""}`}
                      data-testid={`notification-item-${i}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          n.type === "vm" ? "bg-primary/10" : "bg-emerald-100"
                        }`}>
                          {n.type === "vm"
                            ? <BarChart3 className="w-4 h-4 text-primary" />
                            : <Droplets className="w-4 h-4 text-emerald-600" />}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-black text-secondary truncate">{label}</span>
                            {isNew && (
                              <span className="shrink-0 text-[10px] font-black bg-primary text-white px-1.5 py-0.5 rounded-full">NEW</span>
                            )}
                          </div>
                          <p className="text-sm text-secondary line-clamp-2 mb-1">{n.content}</p>
                          <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        </div>
                        {/* Nav button */}
                        <button
                          onClick={handleGo}
                          className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl bg-secondary text-white text-xs font-bold active:scale-95 transition-all"
                          data-testid={`btn-notification-go-${i}`}
                        >
                          보기 <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
