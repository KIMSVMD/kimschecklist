import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CleaningInspection, InsertCleaning, CleaningReply } from "@shared/schema";

export function useCleaningInspections(filters?: { branch?: string; date?: string }) {
  const params = new URLSearchParams();
  if (filters?.branch) params.set("branch", filters.branch);
  if (filters?.date) params.set("date", filters.date);
  const qs = params.toString();
  return useQuery<CleaningInspection[]>({
    queryKey: ["/api/cleaning", filters?.branch, filters?.date],
    queryFn: async () => {
      const res = await fetch(`/api/cleaning${qs ? `?${qs}` : ""}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: true,
  });
}

export function useCreateCleaning() {
  return useMutation({
    mutationFn: (data: InsertCleaning) =>
      apiRequest("POST", "/api/cleaning", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning"] });
    },
  });
}

export function useDeleteCleaning() {
  return useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/cleaning/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning"] });
    },
  });
}

export function useSaveCleaningComment() {
  return useMutation({
    mutationFn: async ({ id, adminComment }: { id: number; adminComment: string }) => {
      const res = await fetch(`/api/cleaning/${id}/comment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminComment }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('코멘트 저장 실패');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning"] });
    },
  });
}

export function useConfirmCleaningComment() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/cleaning/${id}/confirm`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('확인 처리 실패');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning"] });
    },
  });
}

export function useCleaningReplies(cleaningId: number | null) {
  return useQuery<CleaningReply[]>({
    queryKey: ["/api/cleaning", cleaningId, "replies"],
    queryFn: async () => {
      const res = await fetch(`/api/cleaning/${cleaningId}/replies`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: cleaningId != null,
  });
}

export function useAddCleaningReply() {
  return useMutation({
    mutationFn: async ({ id, content, authorType, photoUrl }: { id: number; content: string; authorType: 'admin' | 'staff'; photoUrl?: string | null }) => {
      const res = await fetch(`/api/cleaning/${id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, authorType, photoUrl: photoUrl ?? null }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('답글 저장 실패');
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning", variables.id, "replies"] });
    },
  });
}

export function useUpdateCleaningItemStatus() {
  return useMutation({
    mutationFn: async ({ id, itemName, newStatus }: { id: number; itemName: string; newStatus: 'ok' | 'issue' }) => {
      const res = await fetch(`/api/cleaning/${id}/item-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName, newStatus }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('항목 상태 변경 실패');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning"] });
    },
  });
}
