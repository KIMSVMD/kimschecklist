import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Product, InsertProduct } from "@shared/schema";

export function useProducts(category: string) {
  return useQuery<Product[]>({
    queryKey: ["/api/products", category],
    queryFn: async () => {
      const res = await fetch(`/api/products?category=${encodeURIComponent(category)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!category,
  });
}

export function useCreateProduct() {
  return useMutation({
    mutationFn: (data: InsertProduct) =>
      apiRequest("POST", "/api/products", data).then(r => r.json()),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", variables.category] });
    },
  });
}

export function useDeleteProduct() {
  return useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });
}
