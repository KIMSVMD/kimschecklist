import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getAuthHeaders } from "@/lib/queryClient";
import type { CleaningDraft, InsertCleaningDraft } from "@shared/schema";

// Polls a branch's live in-progress cleaning drafts so a viewer can see photos
// as another staff member uploads them, before that zone's final submit.
export function useCleaningDrafts(branch: string, options?: { enabled?: boolean }) {
  return useQuery<CleaningDraft[]>({
    queryKey: ["/api/cleaning-drafts", branch],
    queryFn: async () => {
      const res = await fetch(`/api/cleaning-drafts?branch=${encodeURIComponent(branch)}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: (options?.enabled ?? true) && !!branch,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
}

export function useSaveCleaningDraft() {
  return useMutation({
    mutationFn: (data: InsertCleaningDraft) =>
      apiRequest("POST", "/api/cleaning-drafts", data).then(r => r.json()),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-drafts", variables.branch] });
    },
  });
}

export function useClearCleaningDraft() {
  return useMutation({
    mutationFn: ({ branch, zone }: { branch: string; zone: string }) =>
      apiRequest("DELETE", "/api/cleaning-drafts", { branch, zone }).then(r => r.json()),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-drafts", variables.branch] });
    },
  });
}
