import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertGuideSchema, insertProductSchema, insertCleaningSchema } from "@shared/schema";
import { z } from "zod";
import path from "path";
import fs from "fs";
import express from "express";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

// Keep /uploads/ static serving for any older records
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req.session as any).isAdmin) {
    return next();
  }
  res.status(401).json({ message: "관리자 권한이 필요합니다." });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use("/uploads", express.static(uploadDir));

  // Register Replit Object Storage routes (/api/uploads/request-url and /objects/*)
  registerObjectStorageRoutes(app);

  // Admin auth routes
  app.post(api.admin.login.path, (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
      (req.session as any).isAdmin = true;
      res.json({ ok: true });
    } else {
      res.status(401).json({ message: "비밀번호가 올바르지 않습니다." });
    }
  });

  app.post(api.admin.logout.path, (req, res) => {
    req.session.destroy(() => {});
    res.json({ ok: true });
  });

  app.get(api.admin.me.path, (req, res) => {
    res.json({ isAdmin: !!(req.session as any).isAdmin });
  });

  // Guide routes (public read, admin write)
  app.get(api.guides.list.path, async (req, res) => {
    try {
      const guideList = await storage.getGuides();
      res.json(guideList);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/guides/product/:product', async (req, res) => {
    try {
      const guide = await storage.getGuideByProduct(decodeURIComponent(req.params.product));
      if (!guide) return res.status(404).json({ message: "Guide not found" });
      res.json(guide);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.guides.create.path, requireAdmin, async (req, res) => {
    try {
      const input = insertGuideSchema.parse(req.body);
      const guide = await storage.createGuide(input);
      res.status(201).json(guide);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.put('/api/guides/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const guide = await storage.updateGuide(id, req.body);
      if (!guide) return res.status(404).json({ message: "Guide not found" });
      res.json(guide);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Guide export: download all guides as JSON
  app.get('/api/admin/guides/export', requireAdmin, async (req, res) => {
    try {
      const guideList = await storage.getGuides();
      res.setHeader('Content-Disposition', 'attachment; filename="guides-export.json"');
      res.json(guideList);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Guide import: upsert guides from JSON array (match by product key)
  app.post('/api/admin/guides/import', requireAdmin, async (req, res) => {
    try {
      const incoming: any[] = req.body;
      if (!Array.isArray(incoming)) return res.status(400).json({ message: "JSON 배열이 필요합니다" });
      const existing = await storage.getGuides();
      const existingMap = new Map(existing.map(g => [g.product, g.id]));
      let created = 0, updated = 0;
      for (const g of incoming) {
        const payload = {
          category: g.category,
          product: g.product,
          imageUrl: g.imageUrl ?? null,
          points: Array.isArray(g.points) ? g.points : [],
          items: Array.isArray(g.items) ? g.items : [],
        };
        if (existingMap.has(g.product)) {
          await storage.updateGuide(existingMap.get(g.product)!, payload);
          updated++;
        } else {
          await storage.createGuide(payload);
          created++;
        }
      }
      res.json({ created, updated, total: incoming.length });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/guides/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteGuide(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Product catalog routes (public read, admin write/delete)
  app.get('/api/products', async (req, res) => {
    try {
      const category = req.query.category as string;
      if (!category) return res.status(400).json({ message: "category required" });
      const list = await storage.getProductsByCategory(category);
      res.json(list);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/products', requireAdmin, async (req, res) => {
    try {
      const input = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.delete('/api/products/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteProduct(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cleaning inspection routes
  app.get('/api/cleaning', async (req, res) => {
    try {
      const filters: { branch?: string; date?: string } = {};
      if (req.query.branch) filters.branch = req.query.branch as string;
      if (req.query.date) filters.date = req.query.date as string;
      const rows = await storage.getCleaningInspections(filters);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/cleaning', async (req, res) => {
    try {
      const input = insertCleaningSchema.parse(req.body);
      const { record, created } = await storage.upsertCleaningInspection(input);
      res.status(created ? 201 : 200).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Cleaning replies (thread - multiple per record)
  app.get('/api/cleaning/:id/replies', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const replies = await storage.getCleaningReplies(id);
      res.json(replies);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/cleaning/:id/replies', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const { content, authorType, photoUrl } = req.body;
      if (!content || !authorType) return res.status(400).json({ message: "content and authorType required" });
      if (!['admin', 'staff'].includes(authorType)) return res.status(400).json({ message: "authorType must be admin or staff" });
      if (authorType === 'admin' && !(req.session as any).isAdmin) {
        return res.status(401).json({ message: "관리자 권한이 필요합니다." });
      }
      const reply = await storage.addCleaningReply({ cleaningId: id, content, authorType, photoUrl: photoUrl ?? null });
      res.status(201).json(reply);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: update a specific item's status in a cleaning inspection
  app.patch('/api/cleaning/:id/item-status', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const { itemName, newStatus } = req.body;
      if (!itemName || !newStatus) return res.status(400).json({ message: "itemName and newStatus required" });
      if (!['ok', 'issue'].includes(newStatus)) return res.status(400).json({ message: "newStatus must be ok or issue" });
      const result = await storage.updateCleaningItemStatus(id, itemName, newStatus);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });


  app.delete('/api/cleaning/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteCleaningInspection(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Checklist routes
  app.get(api.checklists.list.path, async (req, res) => {
    const lists = await storage.getChecklists();
    let filtered = lists;
    if (req.query.branch) {
      filtered = filtered.filter(c => c.branch === req.query.branch);
    }
    if (req.query.category) {
      filtered = filtered.filter(c => c.category === req.query.category);
    }
    res.json(filtered);
  });

  app.get(api.checklists.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const checklist = await storage.getChecklist(id);
    if (!checklist) {
      return res.status(404).json({ message: "Checklist not found" });
    }
    res.json(checklist);
  });

  app.delete('/api/checklists/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteChecklist(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put('/api/checklists/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const checklist = await storage.updateChecklist(id, req.body);
      if (!checklist) return res.status(404).json({ message: "Checklist not found" });
      res.json(checklist);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin comment on checklist
  app.patch('/api/checklists/:id/comment', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const { adminComment } = req.body;
      const result = await storage.updateChecklist(id, { adminComment: adminComment ?? null } as any);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Field staff confirm comment on checklist
  app.patch('/api/checklists/:id/confirm', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const result = await storage.updateChecklist(id, { commentConfirmed: true } as any);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Field staff reply to admin comment on checklist (legacy single-reply)
  app.patch('/api/checklists/:id/reply', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const { staffReply } = req.body;
      const result = await storage.updateChecklist(id, { staffReply: staffReply ?? null } as any);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin assign score to VM checklist
  app.patch('/api/checklists/:id/score', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const { adminScore, adminItems } = req.body;
      if (adminScore === undefined || adminScore === null) {
        const result = await storage.updateChecklist(id, { adminScore: null, adminItems: null } as any);
        if (!result) return res.status(404).json({ message: "Not found" });
        return res.json(result);
      }
      const score = parseInt(adminScore);
      if (isNaN(score) || score < 0 || score > 100) return res.status(400).json({ message: "점수는 0~100 사이여야 합니다." });
      const result = await storage.updateChecklist(id, { adminScore: score, adminItems: adminItems ?? null } as any);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin override individual VM item status (ok → notok or vice versa)
  app.patch('/api/checklists/:id/item-status', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const { itemName, newStatus } = req.body;
      if (!itemName || !newStatus) return res.status(400).json({ message: "itemName and newStatus required" });
      if (!['excellent', 'average', 'poor', 'ok', 'notok'].includes(newStatus)) return res.status(400).json({ message: "newStatus must be excellent, average, poor, ok, or notok" });
      const result = await storage.updateChecklistItemStatus(id, itemName, newStatus);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin notifications — all staff replies across VM & cleaning
  app.get('/api/admin/notifications', requireAdmin, async (req, res) => {
    try {
      const notifications = await storage.getAdminNotifications();
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Staff notifications — admin feedback & replies for a specific branch
  app.get('/api/staff/notifications/:branch', async (req, res) => {
    try {
      const branch = req.params.branch?.trim();
      if (!branch) return res.status(400).json({ message: "branch required" });
      const notifications = await storage.getStaffNotifications(branch);
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Thread replies for VM checklist
  app.get('/api/checklists/:id/replies', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const replies = await storage.getChecklistReplies(id);
      res.json(replies);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/checklists/:id/replies', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const { content, authorType, photoUrl } = req.body;
      if (!content || !authorType) return res.status(400).json({ message: "content and authorType required" });
      if (!['admin', 'staff'].includes(authorType)) return res.status(400).json({ message: "authorType must be admin or staff" });
      if (authorType === 'admin' && !(req.session as any).isAdmin) {
        return res.status(401).json({ message: "관리자 권한이 필요합니다." });
      }
      const reply = await storage.addChecklistReply({ checklistId: id, content, authorType, photoUrl: photoUrl ?? null });
      res.status(201).json(reply);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin comment on cleaning inspection
  app.patch('/api/cleaning/:id/comment', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const { adminComment } = req.body;
      const result = await storage.updateCleaningInspection(id, { adminComment: adminComment ?? null });
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Field staff confirm comment on cleaning inspection
  app.patch('/api/cleaning/:id/confirm', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const result = await storage.updateCleaningInspection(id, { commentConfirmed: true });
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Field staff reply to admin comment on cleaning inspection
  app.patch('/api/cleaning/:id/reply', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const { staffReply } = req.body;
      const result = await storage.updateCleaningInspection(id, { staffReply: staffReply ?? null } as any);
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.checklists.create.path, async (req, res) => {
    try {
      const input = api.checklists.create.input.parse(req.body);
      const checklist = await storage.createChecklist(input);
      res.status(201).json(checklist);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  return httpServer;
}
