"use client";

import {
  ArrowRight, BarChart3, Building2, Check, ChevronRight, CircleHelp, Clock3,
  ContactRound, GitBranch, LayoutDashboard, ListChecks, MessageCircle,
  MessageSquareText, MoreHorizontal, Plus, Search, Send, Settings, Users
} from "lucide-react";
import { useMemo, useState } from "react";

type View = "dashboard" | "flows" | "leads" | "team" | "whatsapp" | "settings";
type LeadStatus = "Novo" | "Direcionado" | "Em atendimento" | "Concluído";

type Lead = {
  id: string;
  name: string;
  phone: string;
  interest: string;
  destination: string;
  status: LeadStatus;
  createdAt: string;
};

const leads: Lead[] = [
  { id: "1", name: "Marcos Lima", phone: "(11) 98765-4321", interest: "Orçamento", destination: "Gabriel · Comercial", status: "Direcionado", createdAt: "Hoje, 11:42" },
  { id: "2", name: "Fernanda Alves", phone: "(11) 97642-1980", interest: "Landing Page", destination: "Gabriel · Comercial", status: "Em atendimento", createdAt: "Hoje, 10:18" },
  { id: "3", name: "Lucas Rocha", phone: "(11) 96618-7712", interest: "Suporte", destination: "Suporte", status: "Novo", createdAt: "Hoje, 09:31" },
  { id: "4", name: "Camila Souza", phone: "(11) 95320-1120", interest: "Financeiro", destination: "Financeiro", status: "Concluído", createdAt: "Ontem, 17:09" },
];

const navItems = [
  { id: "dashboard" as View, label: "Dashboard", icon: LayoutDashboard },
  { id: "flows" as View, label: "Automações", icon: GitBranch },
  { id: "leads" as View, label: "Leads", icon: ContactRound },
  { id: "team" as View, label: "Equipe", icon: Users },
  { id: "whatsapp" as View, label: "WhatsApp", icon: MessageCircle },
  { id: "settings" as View, label: "Configurações", icon: Settings },
];

function Logo() {
  return (
    <div className="brand-lockup">
      <div className="brand-mark">P</div>
      <div><strong>PUXAÍ</strong><span>AUTOMAÇÃO</span></div>
    </div>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const cls = status.toLowerCase().replaceAll(" ", "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return <span className={`status-badge status-${cls}`}>{status}</span>;
}

function LeadTable() {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Contato</th><th>Interesse</th><th>Destino</th><th>Status</th><th>Entrada</th></tr></thead>
        <tbody>{leads.map((lead) => (
          <tr key={lead.id}>
            <td><div className="person-cell"><div className="mini-avatar">{lead.name.split(" ").map((x)=>x[0]).slice(0,2).join("")}</div><div><strong>{lead.name}</strong><span>{lead.phone}</span></div></div></td>
            <td>{lead.interest}</td><td>{lead.destination}</td><td><StatusBadge status={lead.status}/></td><td>{lead.createdAt}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export default function PuxaiApp() {
  const [view, setView] = useState<View>("dashboard");
  const stats = useMemo(() => ({ conversations: 128, quotes: 24, redirected: 41, conversion: 31 }), []);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top"><Logo/></div>
        <div className="workspace-card"><div className="workspace-logo"><Building2 size={18}/></div><div><span>Workspace</span><strong>ogabrieltech</strong></div><ChevronRight size={16}/></div>
        <nav className="nav-list">
          {navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${view===item.id?"active":""}`} onClick={()=>setView(item.id)}><Icon size={19}/><span>{item.label}</span>{item.id==="leads"&&<small>3</small>}</button>; })}
        </nav>
        <div className="sidebar-footer">
          <div className="upgrade-card"><GitBranch size={18}/><strong>Puxaí</strong><p>Automação de atendimento</p><span>v0.1</span></div>
          <div className="profile-row"><div className="avatar">GS</div><div><strong>Gabriel Santos</strong><span>Administrador</span></div><MoreHorizontal size={18}/></div>
        </div>
      </aside>

      <section className="content-area">
        <header className="topbar">
          <div className="topbar-search"><Search size={17}/><span>Buscar na plataforma...</span><kbd>⌘ K</kbd></div>
          <div className="topbar-actions"><div className="status-dot"><span/> Sistema operacional</div><button className="icon-button"><CircleHelp size={19}/></button></div>
        </header>

        {view === "dashboard" && <div className="page dashboard-page">
          <div className="page-heading"><div><span className="eyebrow">VISÃO GERAL</span><h1>Bom dia, Gabriel.</h1><p>Veja para onde seus atendimentos estão sendo direcionados hoje.</p></div><button className="primary-button" onClick={()=>setView("flows")}><Plus size={18}/> Nova automação</button></div>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon"><MessageCircle/></div><span>Atendimentos</span><strong>{stats.conversations}</strong><small>+18% esta semana</small></div>
            <div className="stat-card"><div className="stat-icon"><ListChecks/></div><span>Pedidos de orçamento</span><strong>{stats.quotes}</strong><small>18,7% dos atendimentos</small></div>
            <div className="stat-card"><div className="stat-icon"><Send/></div><span>Direcionamentos</span><strong>{stats.redirected}</strong><small>para vendedores e setores</small></div>
            <div className="stat-card"><div className="stat-icon"><BarChart3/></div><span>Taxa de ação</span><strong>{stats.conversion}%</strong><small>+4,2% vs. semana passada</small></div>
          </div>
          <div className="dashboard-grid">
            <div className="panel performance-panel"><div className="panel-header"><div><span className="eyebrow">ÚLTIMOS 7 DIAS</span><h2>Atendimentos por dia</h2></div></div><div className="chart-wrap">{[42,58,49,74,66,82,71].map((height,index)=><div className="bar-wrap" key={index}><div className="bar" style={{height:`${height}%`}}/><span>{["Sex","Sáb","Dom","Seg","Ter","Qua","Hoje"][index]}</span></div>)}</div></div>
            <div className="panel active-flow-panel"><div className="panel-header"><div><span className="eyebrow">AUTOMAÇÃO PRINCIPAL</span><h2>Atendimento comercial</h2></div><span className="live-pill on"><i/>Ativa</span></div><div className="mini-flow"><div className="mini-step"><div><MessageSquareText size={17}/></div><span>Boas-vindas</span><ArrowRight size={14}/></div><div className="mini-step"><div><ListChecks size={17}/></div><span>Menu</span><ArrowRight size={14}/></div><div className="mini-step"><div><ContactRound size={17}/></div><span>Coleta dados</span><ArrowRight size={14}/></div><div className="mini-step"><div><Send size={17}/></div><span>Vendedor</span></div></div><div className="flow-summary"><div><strong>4</strong><span>blocos</span></div><div><strong>41</strong><span>execuções hoje</span></div><div><strong>0</strong><span>erros</span></div></div><button className="secondary-button full" onClick={()=>setView("flows")}>Editar automação <ArrowRight size={16}/></button></div>
          </div>
          <div className="panel recent-panel"><div className="panel-header"><div><span className="eyebrow">LEADS RECENTES</span><h2>Últimos direcionamentos</h2></div><button className="text-button" onClick={()=>setView("leads")}>Ver todos <ArrowRight size={15}/></button></div><LeadTable/></div>
        </div>}

        {view === "flows" && <div className="page">
          <div className="page-heading"><div><span className="eyebrow">AUTOMAÇÕES</span><h1>Fluxos de atendimento</h1><p>Monte caminhos simples para cada intenção do cliente.</p></div><button className="primary-button"><Plus size={18}/> Novo fluxo</button></div>
          <div className="flow-list-card"><div className="flow-list-main"><div className="flow-list-icon"><GitBranch/></div><div><div className="flow-title-row"><h3>Atendimento comercial</h3><span className="live-pill on"><i/>Ativa</span></div><p>Boas-vindas → menu → coleta de dados → vendedor responsável.</p><div className="flow-meta"><span>4 blocos</span><span>41 execuções hoje</span><span>Editado agora</span></div></div></div><div className="flow-list-actions"><button className="secondary-button">Editar fluxo</button><button className="icon-button"><MoreHorizontal size={18}/></button></div></div>
          <div className="empty-card"><div className="empty-icon"><Plus/></div><h3>Crie novos caminhos quando precisar</h3><p>Separe comercial, financeiro, pós-venda e suporte em fluxos diferentes.</p><button className="ghost-button">Criar novo fluxo <ArrowRight size={15}/></button></div>
        </div>}

        {view === "leads" && <div className="page"><div className="page-heading"><div><span className="eyebrow">LEADS</span><h1>Contatos capturados</h1><p>Acompanhe quem entrou, o que procurou e para quem foi direcionado.</p></div></div><div className="panel recent-panel"><LeadTable/></div></div>}

        {view === "team" && <div className="page"><div className="page-heading"><div><span className="eyebrow">EQUIPE</span><h1>Destinos do atendimento</h1><p>Cadastre vendedores e setores usados nos redirecionamentos.</p></div><button className="primary-button"><Plus size={18}/> Adicionar membro</button></div><div className="stats-grid"><div className="stat-card"><div className="stat-icon"><Users/></div><span>Gabriel Santos</span><strong style={{fontSize:18}}>Comercial</strong><small>WhatsApp conectado</small></div><div className="stat-card"><div className="stat-icon"><Clock3/></div><span>Financeiro</span><strong style={{fontSize:18}}>Setor</strong><small>Seg–Sex · 08h–18h</small></div></div></div>}

        {view === "whatsapp" && <div className="page narrow-page"><div className="page-heading"><div><span className="eyebrow">WHATSAPP</span><h1>Conectar canal</h1><p>Use a API oficial do WhatsApp Business para receber e executar os fluxos do Puxaí.</p></div></div><div className="panel" style={{padding:24}}><div className="panel-header"><div><span className="eyebrow">STATUS</span><h2>Integração preparada</h2></div><span className="live-pill"><i/>Não conectado</span></div><p style={{color:"var(--muted)",fontSize:12,lineHeight:1.7}}>A estrutura de webhook já está no projeto. O próximo passo é informar as credenciais da Meta e validar o número de teste.</p><button className="primary-button">Configurar WhatsApp <ArrowRight size={16}/></button></div></div>}

        {view === "settings" && <div className="page narrow-page"><div className="page-heading"><div><span className="eyebrow">CONFIGURAÇÕES</span><h1>Empresa</h1><p>Dados usados nos fluxos e na operação do workspace.</p></div></div><div className="panel" style={{padding:24}}><div className="panel-header"><div><span className="eyebrow">WORKSPACE</span><h2>ogabrieltech</h2></div><span className="live-pill on"><i/>Ativo</span></div><div className="flow-summary"><div><strong>1</strong><span>WhatsApp</span></div><div><strong>3</strong><span>destinos</span></div><div><strong>1</strong><span>automação</span></div></div><button className="secondary-button"><Check size={15}/> Salvar configurações</button></div></div>}
      </section>
    </main>
  );
}
