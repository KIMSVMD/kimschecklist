import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Serve uploaded files statically
  app.use("/uploads", express.static(uploadDir));

  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

  app.get(api.checklists.list.path, async (req, res) => {
    const lists = await storage.getChecklists();
    
    // Apply filters if provided in query params
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
