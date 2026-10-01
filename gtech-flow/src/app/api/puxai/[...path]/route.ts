import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, destroySession, getSessionUser } from "@/lib/auth";

type RouteContext = { params: Promise<{ path: string[] }> };
type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

async function bodyOf(request: NextRequest) {
  try { return await request.json(); } catch { return {}; }
}

async function requireUser() {
  return await getSessionUser();
}

async function flowStep(flowId: string, position: number) {
  const sql = db();
  const rows = await sql`
    select id, flow_id, position, type, title, config
    from flow_steps
    where flow_id = ${flowId} and position = ${position}
    limit 1
  `;
  return rows[0] || null;
}

async function appendMessage(runId: string, direction: "in" | "out", body: string, metadata: Record<string, unknown> = {}) {
  const sql = db();
  await sql`
    insert into messages (run_id, direction, body, metadata)
    values (${runId}, ${direction}, ${body}, ${sql.json(metadata)})
  `;
}

function businessIsOpen(hours: Record<string, { enabled?: boolean; start?: string; end?: string }> = {}) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value?.toLowerCase().slice(0, 3) || "mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value || "0");
  const current = hour * 60 + minute;
  const day = hours[weekday];
  if (!day?.enabled || !day.start || !day.end) return false;
  const toMinutes = (v: string) => { const [h, m] = v.split(":").map(Number); return h * 60 + m; };
  return current >= toMinutes(day.start) && current <= toMinutes(day.end);
}

async function finishRedirect(user: SessionUser, run: any, step: any) {
  const sql = db();
  const config = step.config || {};
  const department = String(config.department || "Comercial");
  const members = await sql`
    select id, name, department, role, phone
    from team_members
    where workspace_id = ${user.workspace_id} and active = true and department = ${department}
    order by created_at asc
    limit 1
  `;
  const member = members[0] || null;
  const context = run.context || {};
  const destination = member ? `${member.name} · ${member.department}` : department;
  const text = String(config.text || `Vou direcionar seu atendimento para ${destination}.`);
  await appendMessage(run.id, "out", text);

  let lead = (await sql`select * from leads where run_id = ${run.id} limit 1`)[0];
  if (!lead) {
    [lead] = await sql`
      insert into leads (workspace_id, flow_id, run_id, name, phone, interest, destination, destination_phone, status, metadata)
      values (
        ${user.workspace_id}, ${run.flow_id}, ${run.id},
        ${String(context.name || run.contact_name || "Contato")},
        ${String(context.phone || run.contact_phone || "") || null},
        ${String(context.interest || "Atendimento")},
        ${destination}, ${member?.phone || null}, 'Direcionado', ${sql.json(context)}
      ) returning *
    `;
  }

  await sql`update flow_runs set status = 'redirected', completed_at = now(), current_position = ${step.position} where id = ${run.id}`;

  const cleanPhone = String(member?.phone || "").replace(/\D/g, "");
  const message = [
    `Olá ${member?.name || ""}! Vim pelo atendimento automático do Puxaí.`,
    context.name ? `Nome: ${context.name}` : "",
    context.interest ? `Interesse: ${context.interest}` : "",
    context.phone ? `Telefone: ${context.phone}` : "",
  ].filter(Boolean).join("\n");
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}` : null;

  return { done: true, status: "redirected", redirect: { destination, phone: member?.phone || null, url: waUrl, message }, lead };
}

async function advance(user: SessionUser, runId: string) {
  const sql = db();
  let [run] = await sql`select * from flow_runs where id = ${runId} and workspace_id = ${user.workspace_id} limit 1`;
  if (!run) throw new Error("Execução não encontrada");

  const output: any[] = [];
  for (let guard = 0; guard < 30; guard++) {
    const step = await flowStep(run.flow_id, Number(run.current_position));
    if (!step) {
      await sql`update flow_runs set status = 'completed', completed_at = now() where id = ${run.id}`;
      return { done: true, status: "completed", messages: output };
    }
    const cfg = step.config || {};

    if (step.type === "message") {
      const text = String(cfg.text || step.title || "Mensagem");
      await appendMessage(run.id, "out", text, { step_id: step.id });
      output.push({ direction: "out", body: text });
      const next = Number(cfg.next_position || step.position + 1);
      await sql`update flow_runs set current_position = ${next} where id = ${run.id}`;
      run = { ...run, current_position: next };
      continue;
    }

    if (step.type === "menu") {
      const prompt = String(cfg.prompt || "Escolha uma opção:");
      await appendMessage(run.id, "out", prompt, { step_id: step.id, options: cfg.options || [] });
      output.push({ direction: "out", body: prompt });
      return { done: false, status: "running", awaiting: "menu", options: cfg.options || [], messages: output, runId: run.id };
    }

    if (step.type === "question") {
      const prompt = String(cfg.prompt || "Digite sua resposta:");
      await appendMessage(run.id, "out", prompt, { step_id: step.id, field: cfg.field || "answer" });
      output.push({ direction: "out", body: prompt });
      return { done: false, status: "running", awaiting: "question", field: cfg.field || "answer", messages: output, runId: run.id };
    }

    if (step.type === "business_hours") {
      const [workspace] = await sql`select business_hours from workspaces where id = ${user.workspace_id}`;
      const open = businessIsOpen(workspace?.business_hours || {});
      const text = String(open ? (cfg.open_text || "Estamos em horário de atendimento agora.") : (cfg.closed_text || "Estamos fora do horário de atendimento."));
      await appendMessage(run.id, "out", text, { step_id: step.id, open });
      output.push({ direction: "out", body: text });
      const next = cfg.next_position ? Number(cfg.next_position) : 0;
      if (next > 0) {
        await sql`update flow_runs set current_position = ${next} where id = ${run.id}`;
        run = { ...run, current_position: next };
        continue;
      }
      await sql`update flow_runs set status = 'completed', completed_at = now() where id = ${run.id}`;
      return { done: true, status: "completed", messages: output };
    }

    if (step.type === "redirect") {
      const result = await finishRedirect(user, run, step);
      return { ...result, messages: output };
    }

    if (step.type === "link") {
      const text = String(cfg.text || "Acesse o link abaixo:");
      await appendMessage(run.id, "out", text, { step_id: step.id, url: cfg.url || null });
      output.push({ direction: "out", body: text, url: cfg.url || null });
      const next = Number(cfg.next_position || step.position + 1);
      await sql`update flow_runs set current_position = ${next} where id = ${run.id}`;
      run = { ...run, current_position: next };
      continue;
    }

    await sql`update flow_runs set status = 'completed', completed_at = now() where id = ${run.id}`;
    return { done: true, status: "completed", messages: output };
  }

  await sql`update flow_runs set status = 'error', completed_at = now() where id = ${run.id}`;
  throw new Error("Fluxo excedeu o limite de passos");
}

async function simulatorInput(user: SessionUser, runId: string, input: string, value?: string) {
  const sql = db();
  let [run] = await sql`select * from flow_runs where id = ${runId} and workspace_id = ${user.workspace_id} and status = 'running' limit 1`;
  if (!run) throw new Error("Execução não encontrada ou já finalizada");
  const step = await flowStep(run.flow_id, Number(run.current_position));
  if (!step) throw new Error("Passo atual não encontrado");
  const cfg = step.config || {};
  const body = String(input || value || "").trim();
  if (!body) throw new Error("Informe uma resposta");
  await appendMessage(run.id, "in", body, { step_id: step.id });

  if (step.type === "menu") {
    const options = Array.isArray(cfg.options) ? cfg.options : [];
    const selected = options.find((o: any, index: number) => String(o.value) === String(value || body) || String(o.label).toLowerCase() === body.toLowerCase() || String(index + 1) === body);
    if (!selected) return { done: false, status: "running", awaiting: "menu", options, messages: [{ direction: "out", body: "Não entendi. Escolha uma das opções disponíveis." }], runId: run.id };
    const context = { ...(run.context || {}), last_menu: selected.value, last_menu_label: selected.label };
    const next = Number(selected.next_position || step.position + 1);
    await sql`update flow_runs set context = ${sql.json(context)}, current_position = ${next} where id = ${run.id}`;
  } else if (step.type === "question") {
    const field = String(cfg.field || "answer");
    const context = { ...(run.context || {}), [field]: body };
    const next = Number(cfg.next_position || step.position + 1);
    await sql`update flow_runs set context = ${sql.json(context)}, current_position = ${next}, contact_name = coalesce(contact_name, ${field === "name" ? body : null}), contact_phone = coalesce(contact_phone, ${field === "phone" ? body : null}) where id = ${run.id}`;
  } else {
    throw new Error("Este passo não espera uma resposta");
  }
  return await advance(user, run.id);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const route = path.join("/");
  try {
    const user = await requireUser();
    if (!user) return json({ error: "Não autenticado" }, 401);
    const sql = db();

    if (route === "session") return json({ user });

    if (route === "dashboard") {
      const [stats] = await sql`
        select
          (select count(*)::int from flow_runs where workspace_id = ${user.workspace_id}) as conversations,
          (select count(*)::int from leads where workspace_id = ${user.workspace_id}) as leads,
          (select count(*)::int from leads where workspace_id = ${user.workspace_id} and status in ('Direcionado','Em atendimento','Concluído')) as redirected,
          (select count(*)::int from flows where workspace_id = ${user.workspace_id} and active = true) as active_flows
      `;
      const recent = await sql`select * from leads where workspace_id = ${user.workspace_id} order by created_at desc limit 6`;
      const days = await sql`
        select to_char(d::date,'YYYY-MM-DD') as day, coalesce(count(r.id),0)::int as count
        from generate_series(current_date - interval '6 days', current_date, interval '1 day') d
        left join flow_runs r on r.workspace_id = ${user.workspace_id} and r.created_at::date = d::date
        group by d order by d
      `;
      return json({ stats, recent, days });
    }

    if (route === "flows") {
      const flows = await sql`
        select f.*, count(distinct s.id)::int as step_count, count(distinct r.id)::int as run_count
        from flows f
        left join flow_steps s on s.flow_id = f.id
        left join flow_runs r on r.flow_id = f.id
        where f.workspace_id = ${user.workspace_id}
        group by f.id order by f.updated_at desc
      `;
      return json({ flows });
    }

    if (path[0] === "flows" && path[1]) {
      const [flow] = await sql`select * from flows where id = ${path[1]} and workspace_id = ${user.workspace_id} limit 1`;
      if (!flow) return json({ error: "Fluxo não encontrado" }, 404);
      const steps = await sql`select * from flow_steps where flow_id = ${flow.id} order by position`;
      return json({ flow, steps });
    }

    if (route === "team") {
      const members = await sql`select * from team_members where workspace_id = ${user.workspace_id} order by active desc, created_at`;
      return json({ members });
    }

    if (route === "leads") {
      const leads = await sql`select * from leads where workspace_id = ${user.workspace_id} order by created_at desc limit 250`;
      return json({ leads });
    }

    if (route === "workspace") {
      const [workspace] = await sql`select id, name, slug, main_phone, timezone, business_hours from workspaces where id = ${user.workspace_id}`;
      return json({ workspace });
    }

    if (route === "whatsapp") {
      const [channel] = await sql`select * from whatsapp_channels where workspace_id = ${user.workspace_id}`;
      const configured = Boolean(process.env.WHATSAPP_VERIFY_TOKEN && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
      return json({ channel, configured, webhookUrl: `${request.nextUrl.origin}/api/whatsapp/webhook` });
    }

    return json({ error: "Rota não encontrada" }, 404);
  } catch (error) {
    console.error("[Puxai API GET]", error);
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const route = path.join("/");
  const body = await bodyOf(request);
  try {
    const sql = db();

    if (route === "login") {
      const email = String(body.email || "").toLowerCase().trim();
      const password = String(body.password || "");
      const rows = await sql`select id, password_hash from users where email = ${email} limit 1`;
      const user = rows[0];
      if (!user || !(await bcrypt.compare(password, user.password_hash))) return json({ error: "E-mail ou senha inválidos" }, 401);
      await createSession(user.id);
      return json({ ok: true });
    }

    const user = await requireUser();
    if (!user) return json({ error: "Não autenticado" }, 401);

    if (route === "logout") {
      await destroySession();
      return json({ ok: true });
    }

    if (route === "flows") {
      const [flow] = await sql`
        insert into flows (workspace_id, name, description, active)
        values (${user.workspace_id}, ${String(body.name || "Novo fluxo")}, ${String(body.description || "")}, false)
        returning *
      `;
      await sql`insert into flow_steps (flow_id, position, type, title, config) values (${flow.id},1,'message','Boas-vindas',${sql.json({ text: 'Olá! Como podemos ajudar?' })})`;
      return json({ flow }, 201);
    }

    if (path[0] === "flows" && path[1] && path[2] === "save") {
      const flowId = path[1];
      const steps = Array.isArray(body.steps) ? body.steps : [];
      await sql.begin(async (tx) => {
        await tx`update flows set name = ${String(body.name || "Fluxo")}, description = ${String(body.description || "")}, active = ${Boolean(body.active)}, updated_at = now() where id = ${flowId} and workspace_id = ${user.workspace_id}`;
        await tx`delete from flow_steps where flow_id = ${flowId}`;
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          await tx`insert into flow_steps (flow_id, position, type, title, config) values (${flowId}, ${i + 1}, ${String(step.type)}, ${String(step.title || "")}, ${tx.json(step.config || {})})`;
        }
      });
      return json({ ok: true });
    }

    if (path[0] === "flows" && path[1] && path[2] === "delete") {
      await sql`delete from flows where id = ${path[1]} and workspace_id = ${user.workspace_id}`;
      return json({ ok: true });
    }

    if (route === "team") {
      const [member] = await sql`
        insert into team_members (workspace_id, name, department, role, phone, active)
        values (${user.workspace_id}, ${String(body.name || "Novo membro")}, ${String(body.department || "Comercial")}, ${String(body.role || "Vendedor")}, ${String(body.phone || "") || null}, ${body.active !== false})
        returning *
      `;
      return json({ member }, 201);
    }

    if (path[0] === "team" && path[1] && path[2] === "save") {
      const [member] = await sql`
        update team_members set name=${String(body.name || "")}, department=${String(body.department || "Comercial")}, role=${String(body.role || "Vendedor")}, phone=${String(body.phone || "") || null}, active=${body.active !== false}, updated_at=now()
        where id=${path[1]} and workspace_id=${user.workspace_id} returning *
      `;
      return json({ member });
    }

    if (path[0] === "team" && path[1] && path[2] === "delete") {
      await sql`delete from team_members where id=${path[1]} and workspace_id=${user.workspace_id}`;
      return json({ ok: true });
    }

    if (path[0] === "leads" && path[1] && path[2] === "status") {
      const allowed = ['Novo','Direcionado','Em atendimento','Concluído','Perdido'];
      const status = String(body.status || "Novo");
      if (!allowed.includes(status)) return json({ error: "Status inválido" }, 400);
      await sql`update leads set status=${status}, updated_at=now() where id=${path[1]} and workspace_id=${user.workspace_id}`;
      return json({ ok: true });
    }

    if (route === "workspace") {
      const [workspace] = await sql`
        update workspaces set name=${String(body.name || user.workspace_name)}, main_phone=${String(body.main_phone || "") || null}, business_hours=${sql.json(body.business_hours || {})}, updated_at=now()
        where id=${user.workspace_id} returning id,name,slug,main_phone,timezone,business_hours
      `;
      return json({ workspace });
    }

    if (route === "password") {
      const current = String(body.current || "");
      const next = String(body.next || "");
      if (next.length < 8) return json({ error: "A nova senha deve ter pelo menos 8 caracteres" }, 400);
      const [dbUser] = await sql`select password_hash from users where id=${user.id}`;
      if (!dbUser || !(await bcrypt.compare(current, dbUser.password_hash))) return json({ error: "Senha atual incorreta" }, 400);
      const hash = await bcrypt.hash(next, 12);
      await sql`update users set password_hash=${hash}, must_change_password=false, updated_at=now() where id=${user.id}`;
      return json({ ok: true });
    }

    if (route === "simulate/start") {
      const flowId = String(body.flowId || "");
      const [flow] = await sql`select * from flows where id=${flowId} and workspace_id=${user.workspace_id} limit 1`;
      if (!flow) return json({ error: "Fluxo não encontrado" }, 404);
      const [run] = await sql`
        insert into flow_runs (workspace_id, flow_id, current_position, context, channel)
        values (${user.workspace_id}, ${flow.id}, 1, '{}'::jsonb, 'simulator') returning *
      `;
      const result = await advance(user, run.id);
      return json({ ...result, runId: run.id });
    }

    if (path[0] === "simulate" && path[1] && path[2] === "input") {
      const result = await simulatorInput(user, path[1], String(body.input || ""), body.value ? String(body.value) : undefined);
      return json(result);
    }

    return json({ error: "Rota não encontrada" }, 404);
  } catch (error) {
    console.error("[Puxai API POST]", error);
    return json({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
}
