import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getAuthHeaders } from "@/lib/queryClient";
import type { CleaningMonitoringFeedback, InsertCleaningMonitoringFeedback } from "@shared/schema";

export function useCleaningMonitoringFeedback(filters?: { branch?: string; year?: number; month?: number }) {
  const params = new URLSearchParams();
  if (filters?.branch) params.set("branch", filters.branch);
  if (filters?.year) params.set("year", String(filters.year));
  if (filters?.month) params.set("month", String(filters.month));
  const qs = params.toString();
  return useQuery<CleaningMonitoringFeedback[]>({
    queryKey: ["/api/cleaning-monitoring", filters?.branch, filters?.year, filters?.month],
    queryFn: async () => {
      const res = await fetch(`/api/cleaning-monitoring${qs ? `?${qs}` : ""}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });
}

export function useSaveCleaningMonitoringFeedback() {
  return useMutation({
    mutationFn: (data: InsertCleaningMonitoringFeedback) =>
      apiRequest("POST", "/api/cleaning-monitoring", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-monitoring"] });
    },
  });
}
