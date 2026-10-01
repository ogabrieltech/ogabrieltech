import { NextRequest, NextResponse } from "next/server";

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

export async function POST(request: NextRequest) {
  const payload = await request.json();

  // V1: normalize Meta events here, identify the company/number,
  // persist the message and advance the configured flow.
  console.log("[GTECH Flow] WhatsApp event", JSON.stringify(payload));

  return NextResponse.json({ received: true });
}
