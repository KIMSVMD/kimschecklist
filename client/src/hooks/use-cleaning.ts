import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CleaningInspection, InsertCleaning } from "@shared/schema";

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
