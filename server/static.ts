import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPublic = path.resolve(__dirname, "public");
  const distPath = fs.existsSync(distPublic)
    ? distPublic
    : path.resolve(__dirname, "..", "dist");

  if (!fs.existsSync(distPath)) {
    console.warn("No static build directory found, skipping static file serving.");
    return;
  }

  app.use(express.static(distPath));

  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
