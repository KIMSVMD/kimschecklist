import { z } from 'zod';
import { insertChecklistSchema, insertGuideSchema, checklists, guides } from './schema';

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
  guides: {
    list: {
      method: 'GET' as const,
      path: '/api/guides' as const,
      responses: {
        200: z.array(z.custom<typeof guides.$inferSelect>()),
      },
    },
    byProduct: {
      method: 'GET' as const,
      path: '/api/guides/product/:product' as const,
      responses: {
        200: z.custom<typeof guides.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/guides' as const,
      input: insertGuideSchema,
      responses: {
        201: z.custom<typeof guides.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/guides/:id' as const,
      input: insertGuideSchema.partial(),
      responses: {
        200: z.custom<typeof guides.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/guides/:id' as const,
      responses: {
        204: z.null(),
        404: errorSchemas.notFound,
      },
    },
  },
  admin: {
    login: {
      method: 'POST' as const,
      path: '/api/admin/login' as const,
      input: z.object({ password: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean() }),
        401: errorSchemas.validation,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/admin/logout' as const,
      responses: {
        200: z.object({ ok: z.boolean() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/admin/me' as const,
      responses: {
        200: z.object({ isAdmin: z.boolean() }),
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
