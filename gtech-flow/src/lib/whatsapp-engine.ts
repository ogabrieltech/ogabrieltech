import { db } from "./db";

type Incoming = {
  from: string;
  name?: string;
  text: string;
  phoneNumberId?: string;
  messageId?: string;
};

type Workspace = {
  id: string;
  name: string;
  timezone: string;
  business_hours: Record<string, { enabled?: boolean; start?: string; end?: string }>;
};

function cleanPhone(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isBusinessOpen(workspace: Workspace) {
  const timezone = workspace.timezone || "America/Sao_Paulo";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const weekday = (parts.find((p) => p.type === "weekday")?.value || "Mon").toLowerCase().slice(0, 3);
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  const current = hour * 60 + minute;
  const day = workspace.business_hours?.[weekday];
  if (!day?.enabled || !day.start || !day.end) return false;
  const minutes = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  };
  return current >= minutes(day.start) && current <= minutes(day.end);
}

async function sendText(to: string, body: string, phoneNumberId?: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new Error("Credenciais da Cloud API não configuradas");
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v26.0";
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: true, body },
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Meta API ${response.status}: ${detail.slice(0, 500)}`);
  }
  return response.json();
}

async function persistMessage(runId: string, direction: "in" | "out", body: string, metadata: any = {}) {
  const sql = db();
  await sql`
    insert into messages (run_id, direction, body, metadata)
    values (${runId}, ${direction}, ${body}, ${sql.json(metadata as any)})
  `;
}

async function sendAndPersist(runId: string, to: string, body: string, phoneNumberId?: string, metadata: any = {}) {
  const result = await sendText(to, body, phoneNumberId);
  await persistMessage(runId, "out", body, { ...metadata, meta_result: result });
}

async function getStep(flowId: string, position: number) {
  const sql = db();
  const rows = await sql`
    select id, flow_id, position, type, title, config
    from flow_steps
    where flow_id = ${flowId} and position = ${position}
    limit 1
  `;
  return rows[0] || null;
}

async function resolveWorkspace(phoneNumberId?: string) {
  const sql = db();
  if (phoneNumberId) {
    const rows = await sql`
      select w.id, w.name, w.timezone, w.business_hours
      from whatsapp_channels c
      join workspaces w on w.id = c.workspace_id
      where c.phone_number_id = ${phoneNumberId}
      limit 1
    `;
    if (rows[0]) return rows[0] as Workspace;
  }
  const rows = await sql`select id, name, timezone, business_hours from workspaces order by created_at asc limit 1`;
  return (rows[0] || null) as Workspace | null;
}

async function createLead(run: any, workspace: Workspace, destination: string, destinationPhone: string | null) {
  const sql = db();
  const existing = await sql`select * from leads where run_id = ${run.id} limit 1`;
  if (existing[0]) return existing[0];
  const context = run.context || {};
  const rows = await sql`
    insert into leads (
      workspace_id, flow_id, run_id, name, phone, interest,
      destination, destination_phone, status, metadata
    ) values (
      ${workspace.id}, ${run.flow_id}, ${run.id},
      ${String(context.name || run.contact_name || "Contato")},
      ${String(context.phone || run.contact_phone || "") || null},
      ${String(context.interest || context.last_menu_label || "Atendimento")},
      ${destination}, ${destinationPhone}, 'Direcionado', ${sql.json(context as any)}
    ) returning *
  `;
  return rows[0];
}

async function redirect(run: any, workspace: Workspace, step: any, incoming: Incoming) {
  const sql = db();
  const cfg = step.config || {};
  const department = String(cfg.department || "Comercial");
  const members = await sql`
    select id, name, department, role, phone
    from team_members
    where workspace_id = ${workspace.id}
      and active = true
      and lower(department) = lower(${department})
    order by created_at asc
    limit 1
  `;
  const member = members[0] || null;
  const destination = member ? `${member.name} · ${member.department}` : department;
  const destinationPhone = cleanPhone(member?.phone) || null;
  const context = run.context || {};
  let body = String(cfg.text || `Vou direcionar seu atendimento para ${destination}.`);

  if (destinationPhone) {
    const sellerMessage = [
      `Olá ${member.name}! Vim pelo atendimento automático do Puxaí.`,
      context.name ? `Nome: ${context.name}` : "",
      context.interest ? `Interesse: ${context.interest}` : "",
      context.city ? `Cidade: ${context.city}` : "",
      context.phone ? `Telefone: ${context.phone}` : `WhatsApp: ${incoming.from}`,
    ].filter(Boolean).join("\n");
    const url = `https://wa.me/${destinationPhone}?text=${encodeURIComponent(sellerMessage)}`;
    body += `\n\n👉 Falar com ${member.name}: ${url}`;
  } else {
    body += "\n\nSeu contato foi registrado. A equipe dará continuidade ao atendimento.";
  }

  await sendAndPersist(run.id, incoming.from, body, incoming.phoneNumberId, { step_id: step.id, type: "redirect" });
  const lead = await createLead(run, workspace, destination, destinationPhone);
  await sql`
    update flow_runs
    set status = 'redirected', completed_at = now(), current_position = ${step.position}
    where id = ${run.id}
  `;
  return { done: true, lead };
}

async function advance(runId: string, workspace: Workspace, incoming: Incoming) {
  const sql = db();
  let [run] = await sql`select * from flow_runs where id = ${runId} and workspace_id = ${workspace.id} limit 1`;
  if (!run) throw new Error("Execução de fluxo não encontrada");

  for (let guard = 0; guard < 30; guard++) {
    const step = await getStep(run.flow_id, Number(run.current_position));
    if (!step) {
      await sql`update flow_runs set status='completed', completed_at=now() where id=${run.id}`;
      return { done: true };
    }
    const cfg = step.config || {};

    if (step.type === "message") {
      const text = String(cfg.text || step.title || "Mensagem");
      await sendAndPersist(run.id, incoming.from, text, incoming.phoneNumberId, { step_id: step.id });
      const next = Number(cfg.next_position || step.position + 1);
      await sql`update flow_runs set current_position=${next} where id=${run.id}`;
      run = { ...run, current_position: next };
      continue;
    }

    if (step.type === "menu") {
      const options = Array.isArray(cfg.options) ? cfg.options : [];
      const list = options.map((o: any, i: number) => `${i + 1}. ${o.label}`).join("\n");
      const text = `${String(cfg.prompt || "Escolha uma opção:")}\n\n${list}`.trim();
      await sendAndPersist(run.id, incoming.from, text, incoming.phoneNumberId, { step_id: step.id, options });
      return { done: false, awaiting: "menu" };
    }

    if (step.type === "question") {
      const text = String(cfg.prompt || "Digite sua resposta:");
      await sendAndPersist(run.id, incoming.from, text, incoming.phoneNumberId, { step_id: step.id, field: cfg.field || "answer" });
      return { done: false, awaiting: "question" };
    }

    if (step.type === "business_hours") {
      const open = isBusinessOpen(workspace);
      const text = String(open ? (cfg.open_text || "Estamos em horário de atendimento.") : (cfg.closed_text || "Estamos fora do horário de atendimento."));
      await sendAndPersist(run.id, incoming.from, text, incoming.phoneNumberId, { step_id: step.id, open });
      const next = Number(cfg.next_position || 0);
      if (next > 0) {
        await sql`update flow_runs set current_position=${next} where id=${run.id}`;
        run = { ...run, current_position: next };
        continue;
      }
      await sql`update flow_runs set status='completed', completed_at=now() where id=${run.id}`;
      return { done: true };
    }

    if (step.type === "redirect") return redirect(run, workspace, step, incoming);

    if (step.type === "link") {
      const text = `${String(cfg.text || "Acesse o link abaixo:")}\n${String(cfg.url || "")}`.trim();
      await sendAndPersist(run.id, incoming.from, text, incoming.phoneNumberId, { step_id: step.id, url: cfg.url || null });
      const next = Number(cfg.next_position || step.position + 1);
      await sql`update flow_runs set current_position=${next} where id=${run.id}`;
      run = { ...run, current_position: next };
      continue;
    }

    if (step.type === "end") {
      if (cfg.text) await sendAndPersist(run.id, incoming.from, String(cfg.text), incoming.phoneNumberId, { step_id: step.id });
      await sql`update flow_runs set status='completed', completed_at=now() where id=${run.id}`;
      return { done: true };
    }

    throw new Error(`Tipo de bloco não suportado: ${step.type}`);
  }

  await sql`update flow_runs set status='error', completed_at=now() where id=${run.id}`;
  throw new Error("Fluxo excedeu o limite máximo de passos");
}

async function consumeInput(run: any, workspace: Workspace, incoming: Incoming) {
  const sql = db();
  const step = await getStep(run.flow_id, Number(run.current_position));
  if (!step) return advance(run.id, workspace, incoming);
  const cfg = step.config || {};
  const input = incoming.text.trim();
  await persistMessage(run.id, "in", input, { message_id: incoming.messageId, step_id: step.id, channel: "whatsapp" });

  if (step.type === "menu") {
    const options = Array.isArray(cfg.options) ? cfg.options : [];
    const normalized = normalize(input);
    const selected = options.find((o: any, i: number) =>
      String(i + 1) === input || normalize(o.label) === normalized || normalize(o.value) === normalized
    );
    if (!selected) {
      const list = options.map((o: any, i: number) => `${i + 1}. ${o.label}`).join("\n");
      await sendAndPersist(run.id, incoming.from, `Não entendi. Responda com uma das opções:\n\n${list}`, incoming.phoneNumberId, { retry: true });
      return { done: false, awaiting: "menu" };
    }
    const context = { ...(run.context || {}), last_menu: selected.value, last_menu_label: selected.label };
    const next = Number(selected.next_position || step.position + 1);
    await sql`update flow_runs set context=${sql.json(context as any)}, current_position=${next} where id=${run.id}`;
    return advance(run.id, workspace, incoming);
  }

  if (step.type === "question") {
    const field = String(cfg.field || "answer");
    const context = { ...(run.context || {}), [field]: input };
    const next = Number(cfg.next_position || step.position + 1);
    const contactName = field === "name" ? input : run.contact_name;
    const contactPhone = field === "phone" ? input : run.contact_phone;
    await sql`
      update flow_runs
      set context=${sql.json(context as any)}, current_position=${next},
          contact_name=${contactName || null}, contact_phone=${contactPhone || incoming.from}
      where id=${run.id}
    `;
    return advance(run.id, workspace, incoming);
  }

  return advance(run.id, workspace, incoming);
}

export async function processWhatsAppMessage(incoming: Incoming) {
  const sql = db();
  const workspace = await resolveWorkspace(incoming.phoneNumberId);
  if (!workspace) throw new Error("Workspace não encontrado");

  const flows = await sql`
    select id from flows
    where workspace_id=${workspace.id} and active=true
    order by updated_at desc
    limit 1
  `;
  const flow = flows[0];
  if (!flow) {
    await sendText(incoming.from, "O atendimento automático está temporariamente indisponível.", incoming.phoneNumberId);
    return { ignored: false, reason: "no_active_flow" };
  }

  let runs = await sql`
    select * from flow_runs
    where workspace_id=${workspace.id}
      and flow_id=${flow.id}
      and contact_phone=${incoming.from}
      and channel='whatsapp'
      and status='running'
      and created_at > now() - interval '24 hours'
    order by created_at desc
    limit 1
  `;
  let run = runs[0];

  if (!run) {
    [run] = await sql`
      insert into flow_runs (workspace_id, flow_id, contact_name, contact_phone, current_position, context, status, channel)
      values (${workspace.id}, ${flow.id}, ${incoming.name || null}, ${incoming.from}, 1, ${sql.json({ source: "whatsapp", profile_name: incoming.name || null } as any)}, 'running', 'whatsapp')
      returning *
    `;
    await persistMessage(run.id, "in", incoming.text, { message_id: incoming.messageId, initial: true, channel: "whatsapp" });
    return advance(run.id, workspace, incoming);
  }

  return consumeInput(run, workspace, incoming);
}

export function extractIncomingMessages(payload: any): Incoming[] {
  const result: Incoming[] = [];
  if (payload?.object !== "whatsapp_business_account") return result;
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change?.value || {};
      const phoneNumberId = value?.metadata?.phone_number_id;
      const contacts = new Map<string, string>();
      for (const c of value.contacts || []) contacts.set(String(c.wa_id || ""), String(c.profile?.name || ""));
      for (const message of value.messages || []) {
        let text = "";
        if (message.type === "text") text = String(message.text?.body || "");
        else if (message.type === "button") text = String(message.button?.text || message.button?.payload || "");
        else if (message.type === "interactive") {
          text = String(
            message.interactive?.button_reply?.title || message.interactive?.button_reply?.id ||
            message.interactive?.list_reply?.title || message.interactive?.list_reply?.id || ""
          );
        } else continue;
        if (!message.from || !text.trim()) continue;
        result.push({
          from: String(message.from),
          name: contacts.get(String(message.from)) || undefined,
          text: text.trim(),
          phoneNumberId: phoneNumberId ? String(phoneNumberId) : undefined,
          messageId: message.id ? String(message.id) : undefined,
        });
      }
    }
  }
  return result;
}
