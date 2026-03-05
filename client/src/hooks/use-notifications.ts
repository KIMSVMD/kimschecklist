import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";

const LS_KEY = "admin_notif_last_seen_at";

export type AdminNotification = {
  id: number;
  replyId: number;
  type: "vm" | "cleaning";
  content: string;
  photoUrl: string | null;
  createdAt: string;
  branch: string;
  checklistId?: number;
  product?: string;
  category?: string;
  cleaningId?: number;
  zone?: string;
  inspectionTime?: string;
};

export function useAdminNotifications() {
  const { data: notifications = [], isLoading, refetch } = useQuery<AdminNotification[]>({
    queryKey: ["/api/admin/notifications"],
    refetchInterval: 30_000,
  });

  const [lastSeenAt, setLastSeenAtState] = useState<string>(() => {
    return localStorage.getItem(LS_KEY) ?? new Date(0).toISOString();
  });

  const unreadCount = notifications.filter(
    n => new Date(n.createdAt) > new Date(lastSeenAt)
  ).length;

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(LS_KEY, now);
    setLastSeenAtState(now);
  }, []);

  return { notifications, isLoading, unreadCount, markAllRead, lastSeenAt, refetch };
}
