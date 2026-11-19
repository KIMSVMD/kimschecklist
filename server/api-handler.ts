import { MiniApp } from "./http-shim";
import { registerRoutes } from "./routes";

// Required settings — without them the API stops instead of running insecurely (NoA guardrail N-003).
const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET", "ADMIN_PASSWORD"] as const;

let app: MiniApp | null = null;

export async function handleApiRequest(request: Request): Promise<Response> {
  const missing = REQUIRED_ENV.filter(name => !process.env[name]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    return Response.json({ message: "Server is not configured" }, { status: 500 });
  }
  if (!app) {
    app = new MiniApp();
    registerRoutes(app);
  }
  return app.handle(request);
}
