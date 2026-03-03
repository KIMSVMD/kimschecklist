import { z } from 'zod';
import { insertChecklistSchema, checklists } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  checklists: {
    list: {
      method: 'GET' as const,
      path: '/api/checklists' as const,
      input: z.object({
        branch: z.string().optional(),
        category: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof checklists.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/checklists/:id' as const,
      responses: {
        200: z.custom<typeof checklists.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/checklists' as const,
      input: insertChecklistSchema,
      responses: {
        201: z.custom<typeof checklists.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
