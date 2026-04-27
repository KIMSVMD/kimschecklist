import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "../server/routes";
import { seedProductsIfEmpty } from "../server/seed";
import { createServer } from "http";
import { pool } from "../server/db";

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", 1);

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || "fallback-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true,
    sameSite: "none",
  },
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

let initError: Error | null = null;
const initPromise = (async () => {
  try {
    console.log("[init] DB_URL exists:", !!process.env.DATABASE_URL);
    await seedProductsIfEmpty();
    console.log("[init] seed done");
    await registerRoutes(httpServer, app);
    console.log("[init] routes done");
    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      if (res.headersSent) return next(err);
      return res.status(status).json({ message });
    });
  } catch (err: any) {
    initError = err;
    console.error("[init] FAILED:", err?.message, err?.stack);
  }
})();

export default async function handler(req: Request, res: Response) {
  await initPromise;
  if (initError) {
    res.status(500).json({ error: "Init failed", message: initError.message });
    return;
  }
  app(req, res);
}
