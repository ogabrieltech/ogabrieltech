import { NextResponse } from "next/server";

export async function GET() {
  const verifyToken = Boolean(process.env.WHATSAPP_VERIFY_TOKEN);
  const accessToken = Boolean(process.env.WHATSAPP_ACCESS_TOKEN);
  const phoneNumberId = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const businessAccountId = Boolean(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID);

  return NextResponse.json({
    configured: verifyToken && accessToken && phoneNumberId,
    verifyToken,
    accessToken,
    phoneNumberId,
    businessAccountId,
    mode: verifyToken && accessToken && phoneNumberId ? "live" : "test",
  });
}
