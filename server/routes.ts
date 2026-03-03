import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertGuideSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage_config });

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

  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

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

  app.post(api.guides.create.path, requireAdmin, upload.single("image"), async (req, res) => {
    try {
      let body = req.body;
      if (typeof body.points === 'string') body.points = JSON.parse(body.points);
      if (typeof body.items === 'string') body.items = JSON.parse(body.items);
      if (req.file) {
        body.imageUrl = `/uploads/${req.file.filename}`;
      }
      const input = insertGuideSchema.parse(body);
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

  app.put('/api/guides/:id', requireAdmin, upload.single("image"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      let body = req.body;
      if (typeof body.points === 'string') body.points = JSON.parse(body.points);
      if (typeof body.items === 'string') body.items = JSON.parse(body.items);
      if (req.file) {
        body.imageUrl = `/uploads/${req.file.filename}`;
      }
      const guide = await storage.updateGuide(id, body);
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
