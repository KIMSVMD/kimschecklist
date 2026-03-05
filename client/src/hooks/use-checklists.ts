import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function useChecklists(filters?: { branch?: string; category?: string }) {
  // Construct query string for URL
  const queryParams = new URLSearchParams();
  if (filters?.branch) queryParams.append("branch", filters.branch);
  if (filters?.category) queryParams.append("category", filters.category);
  
  const queryString = queryParams.toString();
  const url = `${api.checklists.list.path}${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: [api.checklists.list.path, filters?.branch, filters?.category],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch checklists");
      const data = await res.json();
      return api.checklists.list.responses[200].parse(data);
    },
  });
}

export function useChecklist(id: number) {
  return useQuery({
    queryKey: [api.checklists.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.checklists.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch checklist");
      const data = await res.json();
      return api.checklists.get.responses[200].parse(data);
    },
  });
}

export function useCreateChecklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.checklists.create.input>) => {
      const validated = api.checklists.create.input.parse(data);
      const res = await fetch(api.checklists.create.path, {
        method: api.checklists.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to create checklist");
      }
      return api.checklists.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.checklists.list.path] });
    },
  });
}

export function useDeleteChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/checklists/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('삭제 실패');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.checklists.list.path] });
    },
  });
}

export function useUpdateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof api.checklists.create.input>> }) => {
      const res = await fetch(`/api/checklists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to update checklist');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.checklists.list.path] });
    },
  });
}

export function useUploadPhoto() {
  return useMutation({
    mutationFn: async (file: File) => {
      const { uploadFile } = await import("@/lib/upload");
      return uploadFile(file);
    },
  });
}

export function useSaveChecklistComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, adminComment }: { id: number; adminComment: string }) => {
      const res = await fetch(`/api/checklists/${id}/comment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminComment }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('코멘트 저장 실패');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.checklists.list.path] });
    },
  });
}

export function useConfirmChecklistComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/checklists/${id}/confirm`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('확인 처리 실패');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.checklists.list.path] });
    },
  });
}
