import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CleaningItemGuide, InsertCleaningItemGuide } from "@shared/schema";

// 매뉴얼 가이드 (BEST/WORST photos) for every cleaning zone + item.
export function useCleaningItemGuides() {
  return useQuery<CleaningItemGuide[]>({
    queryKey: ["/api/cleaning-guides"],
    queryFn: async () => {
      const res = await fetch("/api/cleaning-guides");
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });
}

export function useSaveCleaningItemGuide() {
  return useMutation({
    mutationFn: (data: InsertCleaningItemGuide) =>
      apiRequest("PUT", "/api/cleaning-guides", data).then(r => r.json()),
    onSuccess: (row: CleaningItemGuide) => {
      // Put the saved row in the cache right away so a follow-up save builds on it
      queryClient.setQueryData<CleaningItemGuide[]>(["/api/cleaning-guides"], prev =>
        [...(prev ?? []).filter(g => !(g.zone === row.zone && g.item === row.item)), row]);
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-guides"] });
    },
  });
}
