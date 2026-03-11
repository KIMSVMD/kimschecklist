import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Guide } from "@shared/schema";

export function useGuides() {
  return useQuery<Guide[]>({
    queryKey: ['/api/guides'],
    queryFn: async () => {
      const res = await fetch('/api/guides', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch guides');
      return res.json();
    },
  });
}

export function useGuideByProduct(product: string) {
  return useQuery<Guide | null>({
    queryKey: ['/api/guides/product', product],
    queryFn: async () => {
      if (!product) return null;
      const res = await fetch(`/api/guides/product/${encodeURIComponent(product)}`, { credentials: 'include' });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch guide');
      return res.json();
    },
    enabled: !!product,
  });
}

export function useGuidesByProduct(product: string, year?: number, month?: number) {
  return useQuery<Guide[]>({
    queryKey: ['/api/guides/product', product, 'all', year, month],
    queryFn: async () => {
      if (!product) return [];
      const params = year && month ? `?year=${year}&month=${month}` : '';
      const res = await fetch(`/api/guides/product/${encodeURIComponent(product)}/all${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch guides');
      return res.json();
    },
    enabled: !!product,
  });
}

export function useAllAdGuideProducts() {
  return useQuery<string[]>({
    queryKey: ['/api/ad-guides'],
    queryFn: async () => {
      const res = await fetch('/api/ad-guides', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch ad guide products');
      return res.json();
    },
  });
}

export function useAdGuidesByProduct(product: string, year?: number, month?: number) {
  return useQuery<Guide[]>({
    queryKey: ['/api/ad-guides', product, 'all', year, month],
    queryFn: async () => {
      if (!product) return [];
      const params = year && month ? `?year=${year}&month=${month}` : '';
      const res = await fetch(`/api/ad-guides/${encodeURIComponent(product)}/all${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch ad guides');
      return res.json();
    },
    enabled: !!product,
  });
}

export function useAdminStatus() {
  return useQuery<{ isAdmin: boolean }>({
    queryKey: ['/api/admin/me'],
    queryFn: async () => {
      const res = await fetch('/api/admin/me', { credentials: 'include' });
      return res.json();
    },
  });
}

export function useAdminLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) => {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || '로그인 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/me'] });
    },
  });
}

export function useAdminLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/me'] });
    },
  });
}

type GuidePayload = {
  category: string;
  product: string;
  storeType?: string | null;
  guideType?: string;
  points: string[];
  items: string[];
  imageUrl?: string | null;
};

export function useCreateGuide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: GuidePayload) => {
      const res = await fetch('/api/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || '생성 실패');
      }
      return res.json() as Promise<Guide>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/guides'] });
    },
  });
}

export function useUpdateGuide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<GuidePayload> }) => {
      const res = await fetch(`/api/guides/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || '수정 실패');
      }
      return res.json() as Promise<Guide>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/guides'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guides/product'] });
    },
  });
}

export function useDeleteGuide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/guides/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('삭제 실패');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/guides'] });
    },
  });
}
