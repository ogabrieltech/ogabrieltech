import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");

export async function GET() {
  try {
    const sql = db();
    const [{ count }] = await sql`select count(*)::int as count from users`;
    return NextResponse.json({ needsSetup: count === 0 });
  } catch (error) {
    console.error("[Puxai Setup GET]", error);
    return NextResponse.json({ error: "Não foi possível verificar a configuração inicial" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body.token || "").trim();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!token || !name || !email || !password) {
      return NextResponse.json({ error: "Preencha token, nome, e-mail e senha" }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Informe um e-mail válido" }, { status: 400 });
    }
    if (password.length < 10) {
      return NextResponse.json({ error: "Use uma senha com pelo menos 10 caracteres" }, { status: 400 });
    }

    const sql = db();
    const [{ count }] = await sql`select count(*)::int as count from users`;
    if (count > 0) {
      return NextResponse.json({ error: "O administrador inicial já foi configurado" }, { status: 409 });
    }

    const [workspace] = await sql`select id from workspaces order by created_at asc limit 1`;
    if (!workspace) return NextResponse.json({ error: "Workspace não encontrado" }, { status: 500 });

    const [setup] = await sql`
      select id, token_hash from setup_tokens
      where workspace_id=${workspace.id} and used_at is null
      limit 1
    `;
    if (!setup) return NextResponse.json({ error: "Token de configuração não disponível" }, { status: 403 });

    const expected = Buffer.from(String(setup.token_hash));
    const received = Buffer.from(hashToken(token));
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      return NextResponse.json({ error: "Token de configuração inválido" }, { status: 403 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await sql.begin(async (tx) => {
      const rows = await tx`
        insert into users (workspace_id, email, name, password_hash, role, must_change_password)
        values (${workspace.id}, ${email}, ${name}, ${passwordHash}, 'admin', false)
        returning id
      `;
      await tx`update setup_tokens set used_at=now() where id=${setup.id}`;
      return rows;
    });

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Puxai Setup POST]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro na configuração inicial" }, { status: 500 });
  }
}
