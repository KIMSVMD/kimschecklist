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

export function useProductByName(category: string, groupName: string, productName: string | null, enabled = true) {
  return useQuery<Product | null>({
    queryKey: ["/api/products/find", category, groupName, productName],
    queryFn: async () => {
      const params = new URLSearchParams({ category, groupName });
      if (productName) params.set("productName", productName);
      const res = await fetch(`/api/products/find?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: enabled && !!category && !!groupName,
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

export function useUpsertProductFile() {
  return useMutation({
    mutationFn: (data: { category: string; groupName: string; productName?: string | null; fileUrl: string }) =>
      apiRequest("POST", "/api/products/upsert-file", data).then(r => r.json()),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", variables.category] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/find"] });
    },
  });
}

export function useUpdateProductFiles() {
  return useMutation({
    mutationFn: ({ id, fileUrls, category }: { id: number; fileUrls: string[]; category: string }) =>
      apiRequest("PATCH", `/api/products/${id}/files`, { fileUrls }).then(r => r.json()),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", variables.category] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/find"] });
    },
  });
}

export function useDeleteProduct() {
  return useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/find"] });
    },
  });
}
