import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { extractIncomingMessages, processWhatsAppMessage } from "@/lib/whatsapp-engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const mode = search.get("hub.mode");
  const token = search.get("hub.verify_token");
  const challenge = search.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

function validSignature(rawBody: string, signature: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true;
  if (!signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!validSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incoming = extractIncomingMessages(payload);
  if (incoming.length === 0) return NextResponse.json({ received: true, processed: 0 });

  // Meta expects a fast 200 response. Processing is sequential here because the MVP
  // currently uses one WhatsApp workspace; failures are logged without forcing Meta
  // to retry the entire payload and potentially duplicate successful messages.
  let processed = 0;
  const failures: { messageId?: string; error: string }[] = [];
  for (const message of incoming) {
    try {
      await processWhatsAppMessage(message);
      processed += 1;
    } catch (error) {
      console.error("[Puxai WhatsApp]", message.messageId, error);
      failures.push({
        messageId: message.messageId,
        error: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  return NextResponse.json({ received: true, processed, failures: failures.length });
}
