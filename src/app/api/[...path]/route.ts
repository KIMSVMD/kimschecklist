import { handleApiRequest } from "../../../../server/api-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = (request: Request) => handleApiRequest(request);

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
