import { handleFormToken } from "@/lib/lead/server";

/** Hands the browser a signed, short-lived token to send back with the contact form. */
export async function POST(request: Request) {
  return handleFormToken(request);
}
