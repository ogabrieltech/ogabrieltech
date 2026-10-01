import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    const sql = db();
    const [dbCheck] = await sql`select 1 as ok`;
    const [schema] = await sql`
      select
        (select count(*)::int from workspaces) as workspaces,
        (select count(*)::int from users) as users,
        (select count(*)::int from flows) as flows,
        (select count(*)::int from flow_steps) as flow_steps,
        (select count(*)::int from team_members) as team_members
    `;

    return NextResponse.json({
      ok: dbCheck?.ok === 1,
      app: "puxai",
      database: "connected",
      schema,
      latency_ms: Date.now() - started,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Puxai Health]", error);
    return NextResponse.json({
      ok: false,
      app: "puxai",
      database: "error",
      error: error instanceof Error ? error.message : "database error",
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
