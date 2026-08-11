import type { Request, Response, NextFunction } from "express";

// 허용할 오리진을 환경변수로 관리합니다.
// 운영/테스트 등 환경마다 값만 다르게 넣으면 됩니다. (쉼표로 여러 개 지정 가능)
// 예) ALLOWED_ORIGIN=https://kimschecklist-test.onrender.com,https://kimschecklist.onrender.com
function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGIN || "";
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = getAllowedOrigins();

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] || "Content-Type, Authorization",
    );
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
}
