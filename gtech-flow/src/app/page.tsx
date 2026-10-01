"use client";

import {
  ArrowRight, BarChart3, Bot, BriefcaseBusiness, Building2, Check, ChevronRight,
  CircleHelp, Clock3, ContactRound, ExternalLink, GitBranch, LayoutDashboard, Link2,
  ListChecks, Menu, MessageCircle, MessageSquareText, MoreHorizontal, Plus, Search,
  Send, Settings, Sparkles, Users, Webhook, X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FlowStep, FlowStepType, Lead, LeadStatus, TeamMember } from "@/lib/types";

type View = "dashboard" | "flows" | "builder" | "leads" | "team" | "whatsapp" | "settings";

const navItems: { id: View; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "flows", label: "Automações", icon: GitBranch },
  { id: "leads", label: "Leads", icon: ContactRound },
  { id: "team", label: "Equipe", icon: Users },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "settings", label: "Configurações", icon: Settings },
];

const starterSteps: FlowStep[] = [
  { id: "step-1", type: "message", title: "Boas-vindas", description: "Olá! Bem-vindo à GTECH. Como podemos ajudar?" },
  { id: "step-2", type: "menu", title: "Menu principal", description: "Orçamento · Suporte · Financeiro · Horário" },
  { id: "step-3", type: "question", title: "Coletar nome", description: "Antes de continuar, qual é o seu nome?" },
  { id: "step-4", type: "redirect", title: "Direcionar comercial", description: "Abre o WhatsApp do vendedor responsável com mensagem pronta" },
];

const defaultLeads: Lead[] = [
  { id: "1", name: "Marcos Lima", phone: "(11) 98765-4321", interest: "Orçamento", destination: "Gabriel · Comercial", status: "Direcionado", createdAt: "Hoje, 11:42" },
  { id: "2", name: "Fernanda Alves", phone: "(11) 97642-1980", interest: "Landing Page", destination: "Gabriel · Comercial", status: "Em atendimento", createdAt: "Hoje, 10:18" },
  { id: "3", name: "Lucas Rocha", phone: "(11) 96618-7712", interest: "Suporte", destination: "Suporte", status: "Novo", createdAt: "Hoje, 09:31" },
  { id: "4", name: "Camila Souza", phone: "(11) 95320-1120", interest: "Financeiro", destination: "Financeiro", status: "Concluído", createdAt: "Ontem, 17:09" },
];

const defaultTeam: TeamMember[] = [
  { id: "1", name: "Gabriel", department: "Comercial", phone: "+55 11 97847-2593", active: true },
  { id: "2", name: "Financeiro", department: "Financeiro", phone: "+55 11 90000-0001", active: true },
  { id: "3", name: "Suporte", department: "Suporte", phone: "+55 11 90000-0002", active: true },
];

const stepCatalog: { type: FlowStepType; title: string; description: string; icon: React.ElementType }[] = [
  { type: "message", title: "Mensagem", description: "Envia um texto automático", icon: MessageSquareText },
  { type: "menu", title: "Menu", description: "Mostra opções de atendimento", icon: ListChecks },
  { type: "question", title: "Pergunta", description: "Coleta uma informação do cliente", icon: CircleHelp },
  { type: "redirect", title: "Direcionar WhatsApp", description: "Leva para vendedor ou setor", icon: Send },
  { type: "hours", title: "Verificar horário", description: "Cria caminhos por expediente", icon: Clock3 },
  { type: "link", title: "Enviar link", description: "Site, catálogo, pagamento ou mapa", icon: Link2 },
  { type: "finish", title: "Finalizar", description: "Encerra o atendimento", icon: Check },
];

const stepIconMap = Object.fromEntries(stepCatalog.map((item) => [item.type, item.icon])) as Record<FlowStepType, React.ElementType>;

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const cls = status.toLowerCase().replaceAll(" ", "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return <span className={`status-badge status-${cls}`}>{status}</span>;
}

function Logo() {
  return (
    <div className="brand-lockup">
      <div className="brand-mark">G</div>
      <div><strong>GTECH</strong><span>FLOW</span></div>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [steps, setSteps] = useState<FlowStep[]>(starterSteps);
  const [leads, setLeads] = useState<Lead[]>(defaultLeads);
  const [team, setTeam] = useState<TeamMember[]>(defaultTeam);
  const [flowActive, setFlowActive] = useState(true);
  const [showAddStep, setShowAddStep] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState(starterSteps[0].id);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setSteps(loadStored("gtech-flow-steps", starterSteps));
    setLeads(loadStored("gtech-flow-leads", defaultLeads));
    setTeam(loadStored("gtech-flow-team", defaultTeam));
  }, []);
  useEffect(() => localStorage.setItem("gtech-flow-steps", JSON.stringify(steps)), [steps]);
  useEffect(() => localStorage.setItem("gtech-flow-leads", JSON.stringify(leads)), [leads]);
  useEffect(() => localStorage.setItem("gtech-flow-team", JSON.stringify(team)), [team]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const selectedStep = steps.find((step) => step.id === selectedStepId) ?? steps[0];
  const stats = useMemo(() => ({
    conversations: 128,
    quotes: leads.filter((lead) => lead.interest.toLowerCase().includes("orçamento")).length + 23,
    redirected: leads.filter((lead) => lead.status === "Direcionado" || lead.status === "Em atendimento").length + 37,
    conversion: 31,
  }), [leads]);

  const navigate = (next: View) => { setView(next); setMobileNav(false); };

  const addStep = (type: FlowStepType) => {
    const catalog = stepCatalog.find((item) => item.type === type)!;
    const step: FlowStep = { id: crypto.randomUUID(), type, title: catalog.title, description: catalog.description };
    setSteps((current) => [...current, step]);
    setSelectedStepId(step.id);
    setShowAddStep(false);
    notify("Bloco adicionado ao fluxo");
  };

  const updateSelectedStep = (field: "title" | "description", value: string) => {
    setSteps((current) => current.map((step) => step.id === selectedStepId ? { ...step, [field]: value } : step));
  };

  const removeSelectedStep = () => {
    if (steps.length <= 1) return notify("O fluxo precisa ter pelo menos um bloco");
    const index = steps.findIndex((step) => step.id === selectedStepId);
    const nextSteps = steps.filter((step) => step.id !== selectedStepId);
    setSteps(nextSteps);
    setSelectedStepId(nextSteps[Math.max(0, index - 1)].id);
    notify("Bloco removido");
  };

  return (
    <main className="app-shell">
      {toast && <div className="toast"><Check size={16}/>{toast}</div>}
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="sidebar-top"><Logo/><button className="icon-button mobile-only" onClick={()=>setMobileNav(false)}><X size={20}/></button></div>
        <div className="workspace-card"><div className="workspace-logo"><Building2 size={18}/></div><div><span>Workspace</span><strong>ogabrieltech</strong></div><ChevronRight size={16}/></div>
        <nav className="nav-list">
          {navItems.map((item)=>{ const Icon=item.icon; const active=view===item.id || (item.id==="flows"&&view==="builder"); return <button key={item.id} className={`nav-item ${active?"active":""}`} onClick={()=>navigate(item.id)}><Icon size={19}/><span>{item.label}</span>{item.id==="leads"&&<small>3</small>}</button> })}
        </nav>
        <div className="sidebar-footer">
          <div className="upgrade-card"><Sparkles size={18}/><strong>GTECH Flow</strong><p>MVP em desenvolvimento</p><span>v0.1</span></div>
          <div className="profile-row"><div className="avatar">GS</div><div><strong>Gabriel Santos</strong><span>Administrador</span></div><MoreHorizontal size={18}/></div>
        </div>
      </aside>
      {mobileNav&&<button className="scrim" onClick={()=>setMobileNav(false)}/>}

      <section className="content-area">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={()=>setMobileNav(true)}><Menu size={20}/></button>
          <div className="topbar-search"><Search size={17}/><span>Buscar na plataforma...</span><kbd>⌘ K</kbd></div>
          <div className="topbar-actions"><div className="status-dot"><span/> Sistema operacional</div><button className="icon-button"><CircleHelp size={19}/></button></div>
        </header>

        {view==="dashboard"&&<div className="page dashboard-page">
          <div className="page-heading"><div><span className="eyebrow">VISÃO GERAL</span><h1>Bom dia, Gabriel.</h1><p>Acompanhe como o atendimento automático está performando hoje.</p></div><button className="primary-button" onClick={()=>navigate("builder")}><Plus size={18}/> Nova automação</button></div>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon"><MessageCircle/></div><span>Atendimentos</span><strong>{stats.conversations}</strong><small>+18% esta semana</small></div>
            <div className="stat-card"><div className="stat-icon"><BriefcaseBusiness/></div><span>Pedidos de orçamento</span><strong>{stats.quotes}</strong><small>24% dos atendimentos</small></div>
            <div className="stat-card"><div className="stat-icon"><Send/></div><span>Direcionamentos</span><strong>{stats.redirected}</strong><small>para vendedores e setores</small></div>
            <div className="stat-card"><div className="stat-icon"><BarChart3/></div><span>Taxa de ação</span><strong>{stats.conversion}%</strong><small>+4,2% vs. semana passada</small></div>
          </div>
          <div className="dashboard-grid">
            <div className="panel performance-panel"><div className="panel-header"><div><span className="eyebrow">ÚLTIMOS 7 DIAS</span><h2>Atendimentos por dia</h2></div><button className="ghost-button">Esta semana <ChevronRight size={15}/></button></div><div className="chart-wrap">{[42,58,49,74,66,82,71].map((height,index)=><div className="bar-wrap" key={index}><div className="bar" style={{height:`${height}%`}}/><span>{["Sex","Sáb","Dom","Seg","Ter","Qua","Hoje"][index]}</span></div>)}</div></div>
            <div className="panel active-flow-panel"><div className="panel-header"><div><span className="eyebrow">AUTOMAÇÃO PRINCIPAL</span><h2>Atendimento comercial</h2></div><span className={`live-pill ${flowActive?"on":""}`}><i/>{flowActive?"Ativa":"Pausada"}</span></div><div className="mini-flow">{steps.slice(0,4).map((step,index)=>{const Icon=stepIconMap[step.type];return <div key={step.id} className="mini-step"><div><Icon size={17}/></div><span>{step.title}</span>{index<Math.min(steps.length,4)-1&&<ArrowRight size={14}/>}</div>})}</div><div className="flow-summary"><div><strong>{steps.length}</strong><span>blocos</span></div><div><strong>41</strong><span>execuções hoje</span></div><div><strong>0</strong><span>erros</span></div></div><button className="secondary-button full" onClick={()=>navigate("builder")}>Editar automação <ArrowRight size={16}/></button></div>
          </div>
          <div className="panel recent-panel"><div className="panel-header"><div><span className="eyebrow">LEADS RECENTES</span><h2>Últimos direcionamentos</h2></div><button className="text-button" onClick={()=>navigate("leads")}>Ver todos <ArrowRight size={15}/></button></div><LeadTable leads={leads.slice(0,4)}/></div>
        </div>}

        {view==="flows"&&<div className="page">
          <div className="page-heading"><div><span className="eyebrow">AUTOMAÇÕES</span><h1>Fluxos de atendimento</h1><p>Crie caminhos automáticos para organizar cada tipo de contato.</p></div><button className="primary-button" onClick={()=>navigate("builder")}><Plus size={18}/> Novo fluxo</button></div>
          <div className="flow-list-card"><div className="flow-list-main"><div className="flow-list-icon"><GitBranch/></div><div><div className="flow-title-row"><h3>Atendimento comercial</h3><span className="live-pill on"><i/>Ativa</span></div><p>Menu principal com orçamento, suporte, financeiro e horário.</p><div className="flow-meta"><span>{steps.length} blocos</span><span>41 execuções hoje</span><span>Editado agora</span></div></div></div><div className="flow-list-actions"><button className="secondary-button" onClick={()=>navigate("builder")}>Editar fluxo</button><button className="icon-button"><MoreHorizontal size={18}/></button></div></div>
          <div className="empty-card"><div className="empty-icon"><Plus/></div><h3>Crie outros fluxos quando precisar</h3><p>Separe atendimento comercial, pós-venda, financeiro ou campanhas específicas.</p><button className="ghost-button" onClick={()=>navigate("builder")}>Criar novo fluxo <ArrowRight size={15}/></button></div>
        </div>}

        {view==="builder"&&<div className="builder-page">
          <div className="builder-topbar"><div className="builder-breadcrumb"><button onClick={()=>navigate("flows")}>Automações</button><ChevronRight size={14}/><strong>Atendimento comercial</strong></div><div className="builder-actions"><span className="saved-state"><Check size={14}/> Salvo</span><button className={`toggle ${flowActive?"on":""}`} onClick={()=>setFlowActive(!flowActive)}><span/></button><button className="secondary-button" onClick={()=>notify("Teste de fluxo iniciado")}>Testar fluxo</button><button className="primary-button" onClick={()=>notify("Fluxo publicado")}>Publicar</button></div></div>
          <div className="builder-layout"><div className="flow-canvas"><div className="canvas-header"><div><span className="eyebrow">FLUXO PRINCIPAL</span><h1>Atendimento comercial</h1></div><div className="zoom-controls"><button>−</button><span>100%</span><button>+</button></div></div><div className="start-node"><div className="start-icon"><Webhook size={17}/></div><div><span>GATILHO</span><strong>Cliente envia uma mensagem</strong></div></div><div className="connector-line"/><div className="steps-stack">{steps.map((step,index)=>{const Icon=stepIconMap[step.type];return <div key={step.id} className="step-wrapper"><button className={`flow-node ${selectedStepId===step.id?"selected":""}`} onClick={()=>setSelectedStepId(step.id)}><div className={`node-icon node-${step.type}`}><Icon size={18}/></div><div className="node-copy"><span>PASSO {String(index+1).padStart(2,"0")}</span><strong>{step.title}</strong><p>{step.description}</p></div><MoreHorizontal size={18}/></button>{index<steps.length-1&&<div className="node-connector"><span/></div>}</div>})}</div><button className="add-step-button" onClick={()=>setShowAddStep(true)}><Plus size={18}/> Adicionar próximo passo</button></div>
          <aside className="properties-panel"><div className="properties-header"><div><span className="eyebrow">CONFIGURAÇÃO</span><h3>{selectedStep?.title}</h3></div><button className="icon-button"><MoreHorizontal size={18}/></button></div>{selectedStep&&<div className="property-form"><label>Nome interno<input value={selectedStep.title} onChange={e=>updateSelectedStep("title",e.target.value)}/></label><label>Conteúdo / instrução<textarea rows={5} value={selectedStep.description} onChange={e=>updateSelectedStep("description",e.target.value)}/></label>{selectedStep.type==="redirect"&&<><label>Destino<select defaultValue="Gabriel · Comercial"><option>Gabriel · Comercial</option><option>Financeiro</option><option>Suporte</option></select></label><label>Mensagem pré-preenchida<textarea rows={4} defaultValue="Olá! Vim pelo atendimento automático da GTECH e gostaria de continuar meu atendimento."/></label></>}{selectedStep.type==="menu"&&<div className="menu-preview"><span>Opções</span>{["Solicitar orçamento","Suporte","Financeiro","Horário"].map((x,i)=><div key={x}><b>{i+1}</b>{x}<MoreHorizontal size={15}/></div>)}<button><Plus size={15}/> Adicionar opção</button></div>}<div className="property-note"><Bot size={18}/><div><strong>Sem IA</strong><p>Este bloco executa regras fixas e previsíveis.</p></div></div><button className="danger-button" onClick={removeSelectedStep}>Remover bloco</button></div>}</aside></div>
          {showAddStep&&<div className="modal-backdrop" onClick={()=>setShowAddStep(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">NOVO BLOCO</span><h2>O que acontece agora?</h2><p>Escolha uma ação para adicionar ao fluxo.</p></div><button className="icon-button" onClick={()=>setShowAddStep(false)}><X size={20}/></button></div><div className="block-grid">{stepCatalog.map(({type,title,description,icon:Icon})=><button key={type} onClick={()=>addStep(type)}><div><Icon size={20}/></div><strong>{title}</strong><span>{description}</span><ArrowRight size={16}/></button>)}</div></div></div>}
        </div>}

        {view==="leads"&&<div className="page"><div className="page-heading"><div><span className="eyebrow">CRM LEVE</span><h1>Leads capturados</h1><p>Veja quem entrou nos fluxos e para onde cada contato foi direcionado.</p></div><button className="secondary-button" onClick={()=>notify("Exportação CSV entra na próxima versão")}>Exportar</button></div><div className="filter-row"><div className="search-input"><Search size={17}/><input placeholder="Buscar por nome ou telefone"/></div><select><option>Todos os status</option><option>Novo</option><option>Direcionado</option><option>Em atendimento</option><option>Concluído</option></select></div><div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Interesse</th><th>Destino</th><th>Status</th><th>Entrada</th><th/></tr></thead><tbody>{leads.map(lead=><tr key={lead.id}><td><Person lead={lead}/></td><td>{lead.interest}</td><td>{lead.destination}</td><td><select className="status-select" value={lead.status} onChange={e=>setLeads(current=>current.map(item=>item.id===lead.id?{...item,status:e.target.value as LeadStatus}:item))}><option>Novo</option><option>Direcionado</option><option>Em atendimento</option><option>Concluído</option></select></td><td>{lead.createdAt}</td><td><button className="icon-button"><ExternalLink size={16}/></button></td></tr>)}</tbody></table></div></div></div>}

        {view==="team"&&<div className="page"><div className="page-heading"><div><span className="eyebrow">DESTINOS</span><h1>Equipe e setores</h1><p>Cadastre os números que podem receber clientes direcionados pelos fluxos.</p></div><button className="primary-button" onClick={()=>{const member={id:crypto.randomUUID(),name:"Novo atendente",department:"Comercial",phone:"+55 11 90000-0000",active:true};setTeam(c=>[...c,member]);notify("Atendente adicionado")}}><Plus size={18}/> Adicionar</button></div><div className="team-grid">{team.map(member=><div className="team-card" key={member.id}><div className="team-card-top"><div className="team-avatar">{member.name.slice(0,2).toUpperCase()}</div><button className="icon-button"><MoreHorizontal size={18}/></button></div><h3>{member.name}</h3><span>{member.department}</span><div className="team-phone"><MessageCircle size={16}/>{member.phone}</div><div className="team-footer"><span className={`live-pill ${member.active?"on":""}`}><i/>{member.active?"Disponível":"Pausado"}</span><button className={`toggle ${member.active?"on":""}`} onClick={()=>setTeam(c=>c.map(x=>x.id===member.id?{...x,active:!x.active}:x))}><span/></button></div></div>)}</div></div>}

        {view==="whatsapp"&&<div className="page narrow-page"><div className="page-heading"><div><span className="eyebrow">CANAIS</span><h1>Conectar WhatsApp</h1><p>Prepare a integração com a API oficial da Meta para receber e responder mensagens.</p></div></div><div className="connect-card"><div className="connect-hero"><div className="wa-icon"><MessageCircle size={30}/></div><div><span className="connection-pill">Ainda não conectado</span><h2>WhatsApp Business Platform</h2><p>Conecte um número empresarial para ativar os fluxos em produção.</p></div></div><div className="check-list"><div><Check size={17}/><span>Webhook de verificação já preparado no projeto</span></div><div><Check size={17}/><span>Estrutura para múltiplas empresas e números</span></div><div><Check size={17}/><span>Fluxos funcionam sem IA e sem consumo de tokens</span></div></div><div className="endpoint-box"><span>Endpoint do webhook</span><code>/api/whatsapp/webhook</code><button onClick={()=>notify("Endpoint copiado")}>Copiar</button></div><button className="primary-button" onClick={()=>notify("Adicione as credenciais da Meta no .env.local")}>Configurar credenciais <ArrowRight size={17}/></button></div></div>}

        {view==="settings"&&<div className="page narrow-page"><div className="page-heading"><div><span className="eyebrow">WORKSPACE</span><h1>Configurações</h1><p>Dados básicos usados nos fluxos e direcionamentos.</p></div></div><div className="panel settings-card"><div className="settings-section"><h3>Empresa</h3><div className="form-grid"><label>Nome da empresa<input defaultValue="ogabrieltech"/></label><label>Nome público<input defaultValue="GTECH"/></label><label>WhatsApp principal<input defaultValue="+55 11 97847-2593"/></label><label>Fuso horário<select defaultValue="America/Sao_Paulo"><option>America/Sao_Paulo</option></select></label></div></div><div className="settings-section"><h3>Horário padrão</h3><div className="form-grid"><label>Início<input type="time" defaultValue="08:00"/></label><label>Fim<input type="time" defaultValue="18:00"/></label></div></div><button className="primary-button" onClick={()=>notify("Configurações salvas")}>Salvar alterações</button></div></div>}
      </section>
    </main>
  );
}

function Person({lead}:{lead:Lead}) {
  return <div className="person-cell"><div className="mini-avatar">{lead.name.split(" ").map(n=>n[0]).slice(0,2).join("")}</div><div><strong>{lead.name}</strong><span>{lead.phone}</span></div></div>;
}

function LeadTable({leads}:{leads:Lead[]}) {
  return <div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Interesse</th><th>Destino</th><th>Status</th><th>Entrada</th></tr></thead><tbody>{leads.map(lead=><tr key={lead.id}><td><Person lead={lead}/></td><td>{lead.interest}</td><td>{lead.destination}</td><td><StatusBadge status={lead.status}/></td><td>{lead.createdAt}</td></tr>)}</tbody></table></div>;
}
