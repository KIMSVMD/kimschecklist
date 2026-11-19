// Minimal Express-style router so the existing route handlers in routes.ts run unchanged inside
// a Next.js route handler (NoA one-click deploy only supports Next.js). It supports what routes.ts
// uses: app.get/post/put/patch/delete with ":param" paths, middleware chains (next()),
// req.params/query/body/headers, and res.status/json/send/setHeader/end.

export type Request = {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: any;
  headers: Record<string, string | undefined>;
};

export type Response = {
  status(code: number): Response;
  json(body: unknown): Response;
  send(body?: string): Response;
  setHeader(name: string, value: string): Response;
  end(): Response;
};

export type NextFunction = (err?: unknown) => void;
type Handler = (req: Request, res: Response, next: NextFunction) => unknown;

type Route = { method: string; regex: RegExp; keys: string[]; handlers: Handler[] };

function compilePath(path: string) {
  const keys: string[] = [];
  const pattern = path
    .split("/")
    .map(seg => {
      if (seg.startsWith(":")) { keys.push(seg.slice(1)); return "([^/]+)"; }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { regex: new RegExp(`^${pattern}/?$`), keys };
}

class ResponseState implements Response {
  statusCode = 200;
  headers = new Headers();
  body: string | null = null;
  finished = false;
  status(code: number) { this.statusCode = code; return this; }
  setHeader(name: string, value: string) { this.headers.set(name, value); return this; }
  json(body: unknown) {
    if (!this.headers.has("content-type")) this.headers.set("content-type", "application/json; charset=utf-8");
    return this.send(JSON.stringify(body));
  }
  send(body?: string) { this.body = body ?? null; this.finished = true; return this; }
  end() { this.finished = true; return this; }
}

export class MiniApp {
  private routes: Route[] = [];

  private add(method: string, path: string, handlers: Handler[]) {
    this.routes.push({ method, ...compilePath(path), handlers });
  }
  get(path: string, ...h: Handler[]) { this.add("GET", path, h); }
  post(path: string, ...h: Handler[]) { this.add("POST", path, h); }
  put(path: string, ...h: Handler[]) { this.add("PUT", path, h); }
  patch(path: string, ...h: Handler[]) { this.add("PATCH", path, h); }
  delete(path: string, ...h: Handler[]) { this.add("DELETE", path, h); }

  async handle(request: globalThis.Request): Promise<globalThis.Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    // First match in registration order, like Express (e.g. /api/products/find before /api/products/:id)
    let route: Route | undefined;
    let match: RegExpExecArray | null = null;
    for (const r of this.routes) {
      if (r.method !== method) continue;
      match = r.regex.exec(url.pathname);
      if (match) { route = r; break; }
    }
    if (!route || !match) return Response.json({ message: "Not found" }, { status: 404 });

    const params: Record<string, string> = {};
    route.keys.forEach((k, i) => { params[k] = decodeURIComponent(match![i + 1]); });
    const query: Record<string, string | undefined> = {};
    url.searchParams.forEach((v, k) => { if (!(k in query)) query[k] = v; });
    const headers: Record<string, string | undefined> = {};
    request.headers.forEach((v, k) => { headers[k] = v; });

    let body: any = {};
    if (method !== "GET" && method !== "HEAD") {
      const text = await request.text();
      if (text) {
        try { body = JSON.parse(text); } catch { return Response.json({ message: "Invalid JSON body" }, { status: 400 }); }
      }
    }

    const req: Request = { method, path: url.pathname, params, query, body, headers };
    const res = new ResponseState();
    try {
      for (const handler of route.handlers) {
        let calledNext = false;
        await handler(req, res, (err?: unknown) => { if (err) throw err; calledNext = true; });
        if (!calledNext || res.finished) break;
      }
    } catch (err) {
      console.error(`${method} ${url.pathname} failed:`, err);
      if (!res.finished) res.status(500).json({ message: "Internal server error" });
    }
    if (!res.finished) {
      console.error(`${method} ${url.pathname} ended without a response`);
      res.status(500).json({ message: "Internal server error" });
    }
    return new Response(res.body, { status: res.statusCode, headers: res.headers });
  }
}
