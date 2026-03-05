import { useQuery } from "@tanstack/react-query";
import { useState, useCallback } from "react";

export type AdminNotification = {
  id: number;
  notifType: 'new_inspection' | 'reply';
  type: 'vm' | 'cleaning';
  createdAt: string;
  branch: string;
  replyId?: number;
  content?: string | null;
  photoUrl?: string | null;
  checklistId?: number;
  product?: string;
  category?: string;
  cleaningId?: number;
  zone?: string;
  inspectionTime?: string;
};

const LS_KEY = 'admin_notif_last_seen_at';

function getLastSeenAt(): string {
  return localStorage.getItem(LS_KEY) ?? new Date(0).toISOString();
}

export function useAdminNotifications() {
  const [lastSeenAt, setLastSeenAtState] = useState<string>(getLastSeenAt);

  const { data: notifications = [], isLoading, refetch } = useQuery<AdminNotification[]>({
    queryKey: ["/api/admin/notifications"],
    refetchInterval: 30_000,
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
