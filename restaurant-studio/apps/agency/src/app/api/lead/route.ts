import { handleLead } from "@/lib/lead/server";

/** Receives the consultation request form. All of the checks live in src/lib/lead/server.ts. */
export async function POST(request: Request) {
  return handleLead(request);
}
