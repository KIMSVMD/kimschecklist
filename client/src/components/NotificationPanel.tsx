import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Bell, X, BarChart3, Droplets, MessageSquare, ClipboardCheck } from "lucide-react";
import type { AdminNotification } from "@/hooks/use-notifications";

type NotifFilter = '전체' | 'new_inspection' | 'reply';

interface Props {
  open: boolean;
  onClose: () => void;
  notifications: AdminNotification[];
  lastSeenAt: string;
  onNavigate: (target: { type: 'vm' | 'cleaning'; branch: string; checklistId?: number; cleaningId?: number; date?: string }) => void;
}

export function NotificationPanel({ open, onClose, notifications, lastSeenAt, onNavigate }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<NotifFilter>('전체');

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

  const filtered = notifications.filter(n =>
    filter === '전체' ? true : n.notifType === filter
  );

  const tabs: { key: NotifFilter; label: string }[] = [
    { key: '전체', label: '전체' },
    { key: 'new_inspection', label: '새 점검 등록' },
    { key: 'reply', label: '답글' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-50 bg-white shadow-2xl rounded-b-3xl max-h-[82vh] flex flex-col"
            style={{ maxWidth: 480, margin: "0 auto" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-secondary" />
                <h2 className="text-lg font-black text-secondary">관리자 알림</h2>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-all"
                data-testid="btn-notification-close"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 px-4 py-3 border-b border-border/40 bg-muted/30 shrink-0">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    filter === tab.key
                      ? 'bg-secondary text-white shadow-sm'
                      : 'text-muted-foreground hover:text-secondary'
                  }`}
                  data-testid={`btn-notif-filter-${tab.key}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 divide-y divide-border/40">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <MessageSquare className="w-10 h-10 opacity-30" />
                  <p className="font-medium">알림이 없습니다</p>
                </div>
              ) : (
                filtered.map((n, i) => {
                  const isNew = new Date(n.createdAt) > new Date(lastSeenAt);
                  const timeAgo = formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ko });
                  const isVM = n.type === 'vm';

                  // Label
                  const locationLabel = isVM
                    ? `${n.branch}점 · ${n.category ?? ''} / ${n.product ?? ''}`
                    : `${n.branch}점 · ${n.zone ?? ''} ${n.inspectionTime ?? ''}`;

                  // Badge
                  const badge = n.notifType === 'new_inspection' ? '새 점검' : '답글';
                  const badgeBg = n.notifType === 'new_inspection' ? 'bg-emerald-500' : 'bg-amber-500';

                  // Icon bg
                  const iconBg = isVM
                    ? (n.notifType === 'new_inspection' ? 'bg-primary/10' : 'bg-orange-100')
                    : (n.notifType === 'new_inspection' ? 'bg-emerald-100' : 'bg-teal-100');

                  const Icon = n.notifType === 'new_inspection'
                    ? (isVM ? BarChart3 : Droplets)
                    : (isVM ? MessageSquare : ClipboardCheck);

                  const iconColor = isVM
                    ? (n.notifType === 'new_inspection' ? 'text-primary' : 'text-orange-500')
                    : (n.notifType === 'new_inspection' ? 'text-emerald-600' : 'text-teal-600');

                  return (
                    <div
                      key={`${n.notifType}-${n.type}-${n.id}`}
                      className={`px-5 py-4 transition-colors ${isNew ? 'bg-emerald-50/50' : ''}`}
                      data-testid={`notification-item-${i}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
                          <Icon className={`w-4 h-4 ${iconColor}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span className={`shrink-0 text-[10px] font-black text-white px-1.5 py-0.5 rounded-full ${badgeBg}`}>
                              {badge}
                            </span>
                            <span className="text-xs font-bold text-secondary truncate">{locationLabel}</span>
                            {isNew && (
                              <span className="shrink-0 text-[10px] font-black bg-primary text-white px-1.5 py-0.5 rounded-full">NEW</span>
                            )}
                          </div>
                          {n.notifType === 'reply' && n.content && (
                            <p className="text-sm text-secondary line-clamp-2 mb-1">{n.content}</p>
                          )}
                          {n.notifType === 'new_inspection' && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {isVM ? 'VM 점검이 신규 등록됐습니다' : '청소 점검이 신규 등록됐습니다'}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        </div>
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
