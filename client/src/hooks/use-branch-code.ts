import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useVerifyBranchCode() {
  return useMutation({
    mutationFn: async ({ branch, code }: { branch: string; code: string }) => {
      const res = await apiRequest("POST", "/api/branch-code/verify", { branch, code });
      const data = await res.json();
      return data.valid as boolean;
    },
  });
}
