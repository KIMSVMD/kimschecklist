import { useQuery } from "@tanstack/react-query";
import { useState, useCallback, useEffect } from "react";

export type StaffNotification = {
  id: number;
  notifCategory: 'comment_reply' | 'score_change';
  type: 'vm_comment' | 'vm_reply' | 'cleaning_comment' | 'cleaning_reply' | 'vm_score' | 'cleaning_score';
  createdAt: string;
  branch: string;
  content?: string | null;
  photoUrl?: string | null;
  checklistId?: number;
  product?: string;
  category?: string;
  cleaningId?: number;
  zone?: string;
  inspectionTime?: string;
  itemName?: string;
  oldStatus?: string;
  newStatus?: string;
};

function staffNotifKey(n: StaffNotification): string {
  const target = n.checklistId ?? n.cleaningId ?? 0;
  return `staff-${n.type}-${n.id}-${target}`;
}

function getStaffDismissedKeys(branch: string): Set<string> {
  try {
    const stored = localStorage.getItem(`staff_notif_dismissed_${branch}`);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveStaffDismissedKeys(branch: string, keys: Set<string>) {
  localStorage.setItem(`staff_notif_dismissed_${branch}`, JSON.stringify([...keys]));
}

export function useStaffNotifications(branch: string) {
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() =>
    branch ? getStaffDismissedKeys(branch) : new Set()
  );

  useEffect(() => {
    if (branch) setDismissedKeys(getStaffDismissedKeys(branch));
  }, [branch]);

  const { data: allNotifications = [] } = useQuery<StaffNotification[]>({
    queryKey: ['/api/staff/notifications', branch],
    enabled: !!branch,
    refetchInterval: 30_000,
  });

  const notifications = allNotifications.filter(n => !dismissedKeys.has(staffNotifKey(n)));
  const unreadCount = notifications.length;

  const dismiss = useCallback((key: string) => {
    setDismissedKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      saveStaffDismissedKeys(branch, next);
      return next;
    });
  }, [branch]);

  const dismissAll = useCallback(() => {
    setDismissedKeys(prev => {
      const next = new Set(prev);
      allNotifications.forEach(n => next.add(staffNotifKey(n)));
      saveStaffDismissedKeys(branch, next);
      return next;
    });
  }, [branch, allNotifications]);

  return { notifications, unreadCount, dismiss, dismissAll, staffNotifKey };
}

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

const LS_KEY = 'admin_notif_dismissed_keys';

function getDismissedKeys(): Set<string> {
  try {
    const stored = localStorage.getItem(LS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedKeys(keys: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...keys]));
}

export function notifKey(n: AdminNotification): string {
  return `${n.notifType}-${n.type}-${n.replyId ?? n.checklistId ?? n.cleaningId}`;
}

export function useAdminNotifications() {
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(getDismissedKeys);

  const { data: allNotifications = [] } = useQuery<AdminNotification[]>({
    queryKey: ["/api/admin/notifications"],
    refetchInterval: 30_000,
  });

  const notifications = allNotifications.filter(n => !dismissedKeys.has(notifKey(n)));
  const unreadCount = notifications.length;

  const dismiss = useCallback((key: string) => {
    setDismissedKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      saveDismissedKeys(next);
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    setDismissedKeys(prev => {
      const next = new Set(prev);
      allNotifications.forEach(n => next.add(notifKey(n)));
      saveDismissedKeys(next);
      return next;
    });
  }, [allNotifications]);

  return { notifications, unreadCount, dismiss, dismissAll };
}
