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
      const row = await storage.createCleaningInspection(input);
      res.status(201).json(row);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
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
