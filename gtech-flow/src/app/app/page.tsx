"use client";

import {
  ArrowDown, ArrowRight, ArrowUp, BarChart3, Building2, Check, ChevronRight,
  CircleHelp, Clock3, ContactRound, Copy, ExternalLink, GitBranch, LayoutDashboard,
  Link as LinkIcon, ListChecks, LogOut, Menu, MessageCircle, MessageSquareText,
  MoreHorizontal, PlayCircle, Plus, Save, Send, Settings, Trash2, Users, X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./app.module.css";

type View = "dashboard" | "flows" | "leads" | "team" | "test" | "whatsapp" | "settings";
type FlowStepType = "message" | "menu" | "question" | "redirect" | "business_hours" | "link" | "end";
type FlowStep = { id?: string; type: FlowStepType; title: string; config: any };
type Flow = { id: string; name: string; description: string; active: boolean; step_count?: number; run_count?: number };
type Member = { id: string; name: string; department: string; role: string; phone?: string | null; active: boolean };
type Lead = { id:string; name:string; phone?:string|null; interest?:string|null; destination?:string|null; status:string; created_at:string };

const navItems = [
  ["dashboard", "Dashboard", LayoutDashboard], ["flows", "Automações", GitBranch], ["leads", "Leads", ContactRound],
  ["team", "Equipe", Users], ["test", "Testar", PlayCircle], ["whatsapp", "WhatsApp", MessageCircle], ["settings", "Configurações", Settings],
] as const;

const blockCatalog: { type: FlowStepType; label: string; icon: any; config: any }[] = [
  { type:"message", label:"Mensagem", icon:MessageSquareText, config:{ text:"Digite sua mensagem" } },
  { type:"menu", label:"Menu", icon:ListChecks, config:{ prompt:"Escolha uma opção:", options:[{label:"Opção 1",value:"opcao_1",next_position:1}] } },
  { type:"question", label:"Pergunta", icon:ContactRound, config:{ prompt:"Digite sua resposta:", field:"answer" } },
  { type:"redirect", label:"Direcionar", icon:Send, config:{ department:"Comercial", text:"Vou direcionar seu atendimento." } },
  { type:"business_hours", label:"Horário", icon:Clock3, config:{ open_text:"Estamos abertos.", closed_text:"Estamos fora do horário de atendimento." } },
  { type:"link", label:"Link", icon:LinkIcon, config:{ text:"Acesse o link:", url:"https://" } },
  { type:"end", label:"Finalizar", icon:Check, config:{} },
];

function formatDate(value:string) {
  try { return new Intl.DateTimeFormat("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }).format(new Date(value)); } catch { return value; }
}
function initials(name:string) { return name.split(" ").map(v=>v[0]).join("").slice(0,2).toUpperCase(); }
function cleanPhone(phone?:string|null) { return String(phone||"").replace(/\D/g,""); }

export default function PuxaiApp() {
  const router = useRouter();
  const [view,setView] = useState<View>("dashboard");
  const [user,setUser] = useState<any>(null);
  const [dashboard,setDashboard] = useState<any>(null);
  const [flows,setFlows] = useState<Flow[]>([]);
  const [team,setTeam] = useState<Member[]>([]);
  const [leads,setLeads] = useState<Lead[]>([]);
  const [workspace,setWorkspace] = useState<any>(null);
  const [wa,setWa] = useState<any>(null);
  const [loading,setLoading] = useState(true);
  const [toast,setToast] = useState("");
  const [editor,setEditor] = useState<{flow:Flow;steps:FlowStep[]}|null>(null);
  const [newMember,setNewMember] = useState({name:"",department:"Comercial",role:"Vendedor",phone:""});
  const [editingMember,setEditingMember] = useState<Member|null>(null);
  const [sim,setSim] = useState<any>({ flowId:"", runId:"", messages:[], awaiting:null, options:[], redirect:null, input:"" });
  const [passwords,setPasswords] = useState({current:"",next:""});

  async function api(path:string, options:RequestInit={}) {
    const response = await fetch(`/api/puxai/${path}`, { ...options, headers:{"Content-Type":"application/json", ...(options.headers||{})} });
    if (response.status===401) { router.replace("/login"); throw new Error("Sessão expirada"); }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erro na operação");
    return data;
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [session,dash,flowData,teamData,leadData,workspaceData,waData] = await Promise.all([
        api("session"),api("dashboard"),api("flows"),api("team"),api("leads"),api("workspace"),api("whatsapp")
      ]);
      setUser(session.user); setDashboard(dash); setFlows(flowData.flows); setTeam(teamData.members); setLeads(leadData.leads); setWorkspace(workspaceData.workspace); setWa(waData);
      if (!sim.flowId && flowData.flows[0]) setSim((s:any)=>({...s,flowId:flowData.flows.find((f:Flow)=>f.active)?.id || flowData.flows[0].id}));
    } catch (e:any) { if (e?.message!=="Sessão expirada") showToast(e?.message||"Erro ao carregar"); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ loadAll(); },[]); // eslint-disable-line react-hooks/exhaustive-deps
  function showToast(message:string){ setToast(message); window.setTimeout(()=>setToast(""),2800); }

  const stats = dashboard?.stats || { conversations:0,leads:0,redirected:0,active_flows:0 };
  const conversion = stats.conversations ? Math.round((stats.redirected/stats.conversations)*100) : 0;

  async function logout(){ await api("logout",{method:"POST",body:"{}"}); router.replace("/login"); }
  async function createFlow(){ const data=await api("flows",{method:"POST",body:JSON.stringify({name:"Novo fluxo",description:""})}); await loadFlows(); await openEditor(data.flow.id); }
  async function loadFlows(){ const d=await api("flows"); setFlows(d.flows); }
  async function openEditor(id:string){ const d=await api(`flows/${id}`); setEditor({flow:d.flow,steps:d.steps.map((s:any)=>({id:s.id,type:s.type,title:s.title||"",config:s.config||{}}))}); }
  async function saveFlow(){ if(!editor)return; await api(`flows/${editor.flow.id}/save`,{method:"POST",body:JSON.stringify({name:editor.flow.name,description:editor.flow.description,active:editor.flow.active,steps:editor.steps})}); showToast("Fluxo salvo"); await loadFlows(); setEditor(null); }
  async function deleteFlow(id:string){ if(!confirm("Excluir este fluxo?"))return; await api(`flows/${id}/delete`,{method:"POST",body:"{}"}); showToast("Fluxo excluído"); await loadFlows(); }
  function addBlock(type:FlowStepType){ if(!editor)return; const template=blockCatalog.find(b=>b.type===type)!; setEditor({...editor,steps:[...editor.steps,{type,title:template.label,config:JSON.parse(JSON.stringify(template.config))}]}); }
  function patchStep(index:number, patch:any){ if(!editor)return; const steps=[...editor.steps]; steps[index]={...steps[index],...patch}; setEditor({...editor,steps}); }
  function patchConfig(index:number, patch:any){ if(!editor)return; const steps=[...editor.steps]; steps[index]={...steps[index],config:{...steps[index].config,...patch}}; setEditor({...editor,steps}); }
  function moveStep(index:number,dir:-1|1){ if(!editor)return; const j=index+dir;if(j<0||j>=editor.steps.length)return; const steps=[...editor.steps];[steps[index],steps[j]]=[steps[j],steps[index]];setEditor({...editor,steps}); }
  function removeStep(index:number){ if(!editor)return; setEditor({...editor,steps:editor.steps.filter((_,i)=>i!==index)}); }

  async function addMember(){ if(!newMember.name.trim())return showToast("Informe o nome"); await api("team",{method:"POST",body:JSON.stringify(newMember)}); setNewMember({name:"",department:"Comercial",role:"Vendedor",phone:""}); showToast("Membro adicionado"); const d=await api("team");setTeam(d.members); }
  async function saveMember(){ if(!editingMember)return; await api(`team/${editingMember.id}/save`,{method:"POST",body:JSON.stringify(editingMember)}); setEditingMember(null); const d=await api("team");setTeam(d.members);showToast("Membro atualizado"); }
  async function deleteMember(id:string){ if(!confirm("Excluir este destino?"))return; await api(`team/${id}/delete`,{method:"POST",body:"{}"}); const d=await api("team");setTeam(d.members); }
  async function changeLeadStatus(id:string,status:string){ await api(`leads/${id}/status`,{method:"POST",body:JSON.stringify({status})}); const d=await api("leads");setLeads(d.leads); const dash=await api("dashboard");setDashboard(dash); }

  async function startSim(){ if(!sim.flowId)return; const d=await api("simulate/start",{method:"POST",body:JSON.stringify({flowId:sim.flowId})}); setSim((s:any)=>({...s,runId:d.runId,messages:d.messages||[],awaiting:d.awaiting||null,options:d.options||[],redirect:d.redirect||null,input:""})); setTimeout(()=>loadLeadData(),300); }
  async function sendSim(input?:string,value?:string){ const text=input ?? sim.input;if(!sim.runId||!text)return; const userMsg={direction:"in",body:text}; const d=await api(`simulate/${sim.runId}/input`,{method:"POST",body:JSON.stringify({input:text,value})}); setSim((s:any)=>({...s,messages:[...s.messages,userMsg,...(d.messages||[])],awaiting:d.awaiting||null,options:d.options||[],redirect:d.redirect||null,input:""})); if(d.done) await loadLeadData(); }
  async function loadLeadData(){ const [ld,dd]=await Promise.all([api("leads"),api("dashboard")]);setLeads(ld.leads);setDashboard(dd); }

  async function saveWorkspace(){ await api("workspace",{method:"POST",body:JSON.stringify(workspace)});showToast("Configurações salvas"); }
  async function changePassword(){ try{await api("password",{method:"POST",body:JSON.stringify(passwords)});setPasswords({current:"",next:""});showToast("Senha alterada");}catch(e:any){showToast(e.message);} }

  if(loading) return <main className={styles.shell}><div style={{margin:"auto",fontSize:12,color:"#6d3bf2",fontWeight:800}}>Carregando Puxaí...</div></main>;

  return <main className={styles.shell}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}><div className={styles.brandMark}>P</div><div className={styles.brandCopy}><strong>PUXAÍ</strong><span>AUTOMAÇÃO</span></div></div>
      <div className={styles.workspace}><div className={styles.workspaceIcon}><Building2 size={17}/></div><div><span>Workspace</span><strong>{user?.workspace_name}</strong></div><ChevronRight size={15}/></div>
      <nav className={styles.nav}>{navItems.map(([id,label,Icon])=><button key={id} className={`${styles.navButton} ${view===id?styles.navButtonActive:""}`} onClick={()=>setView(id as View)}><Icon size={18}/><span>{label}</span>{id==="leads"&&leads.length>0&&<small className={styles.navBadge}>{leads.length}</small>}</button>)}</nav>
      <div className={styles.sidebarFooter}><div className={styles.modeCard}><strong>Puxaí v0.2</strong><p>Banco real, editor de fluxo e simulador integrados.</p><span className={styles.modePill}><span className={styles.dot}/> PRODUÇÃO</span></div><div className={styles.profile}><div className={styles.avatar}>{initials(user?.name||"Admin")}</div><div><strong>{user?.name}</strong><span>{user?.role}</span></div></div></div>
    </aside>

    <section className={styles.main}>
      <header className={styles.topbar}><div className={styles.topbarLeft}><strong>{view==="test"?"Ambiente de teste":"Painel de operação"}</strong></div><div style={{display:"flex",gap:8,alignItems:"center"}}><div className={styles.health}><span className={styles.healthDot}/> Sistema operacional</div><button className={styles.iconButton} title="Sair" onClick={logout}><LogOut size={17}/></button></div></header>

      {view==="dashboard"&&<section className={styles.page}>
        <div className={styles.heading}><div><span className={styles.eyebrow}>VISÃO GERAL</span><h1>Bom dia, {user?.name?.split(" ")[0]}.</h1><p>Acompanhe os atendimentos, leads e direcionamentos reais do seu workspace.</p></div><button className={styles.buttonPrimary} onClick={()=>setView("test")}><PlayCircle size={17}/> Testar atendimento</button></div>
        <div className={styles.grid4}><Stat icon={MessageCircle} label="Atendimentos" value={stats.conversations} note="execuções registradas"/><Stat icon={ContactRound} label="Leads capturados" value={stats.leads} note="contatos gerados"/><Stat icon={Send} label="Direcionamentos" value={stats.redirected} note="para equipe e setores"/><Stat icon={BarChart3} label="Taxa de ação" value={`${conversion}%`} note={`${stats.active_flows} fluxo(s) ativo(s)`}/></div>
        <div className={styles.dashboardGrid}>
          <div className={`${styles.panel} ${styles.quickPanel}`}><div className={styles.panelHeader}><div><span className={styles.eyebrow}>ÚLTIMOS 7 DIAS</span><h2>Atendimentos por dia</h2></div></div><div style={{height:220,display:"flex",alignItems:"end",gap:13,paddingTop:25}}>{(dashboard?.days||[]).map((d:any,i:number)=>{const max=Math.max(1,...dashboard.days.map((x:any)=>x.count));return <div key={d.day} style={{flex:1,height:"100%",display:"flex",flexDirection:"column",justifyContent:"end",alignItems:"center",gap:7}}><div style={{width:"60%",minHeight:d.count?8:2,height:`${Math.max(2,(d.count/max)*85)}%`,background:"linear-gradient(#7650e8,#a891f0)",borderRadius:"7px 7px 3px 3px"}}/><span style={{fontSize:8,color:"#8a8392"}}>{["D-6","D-5","D-4","D-3","D-2","Ontem","Hoje"][i]}</span></div>})}</div></div>
          <div className={`${styles.panel} ${styles.quickPanel}`}><div className={styles.panelHeader}><div><span className={styles.eyebrow}>FLUXO ATIVO</span><h2>{flows.find(f=>f.active)?.name||"Nenhum fluxo ativo"}</h2></div>{flows.some(f=>f.active)&&<span className={`${styles.pill} ${styles.pillOn}`}><span className={styles.dot}/>Ativo</span>}</div><div className={styles.flowPreview}><Preview icon={MessageSquareText} label="Recebe"/><ArrowRight size={13}/><Preview icon={ListChecks} label="Menu"/><ArrowRight size={13}/><Preview icon={ContactRound} label="Coleta"/><ArrowRight size={13}/><Preview icon={Send} label="Direciona"/></div><div className={styles.summary}><div><strong>{flows.find(f=>f.active)?.step_count||0}</strong><span>blocos</span></div><div><strong>{flows.find(f=>f.active)?.run_count||0}</strong><span>execuções</span></div><div><strong>{team.filter(t=>t.active).length}</strong><span>destinos ativos</span></div></div><button className={styles.buttonSecondary} style={{width:"100%"}} onClick={()=>setView("flows")}>Editar automação <ArrowRight size={14}/></button></div>
        </div>
        <LeadTable leads={dashboard?.recent||[]} onStatus={changeLeadStatus}/>
      </section>}

      {view==="flows"&&<section className={styles.page}>
        <div className={styles.heading}><div><span className={styles.eyebrow}>AUTOMAÇÕES</span><h1>Fluxos de atendimento</h1><p>Crie o caminho que o cliente percorre desde a primeira mensagem até o destino.</p></div><button className={styles.buttonPrimary} onClick={createFlow}><Plus size={17}/> Novo fluxo</button></div>
        {editor?<FlowEditor editor={editor} setEditor={setEditor} team={team} addBlock={addBlock} patchStep={patchStep} patchConfig={patchConfig} moveStep={moveStep} removeStep={removeStep} save={saveFlow} cancel={()=>setEditor(null)}/>:<div className={styles.list}>{flows.map(flow=><div className={styles.flowCard} key={flow.id}><div className={styles.flowCardMain}><div className={styles.flowIcon}><GitBranch size={19}/></div><div><div style={{display:"flex",gap:8,alignItems:"center"}}><h3>{flow.name}</h3>{flow.active&&<span className={`${styles.pill} ${styles.pillOn}`}><span className={styles.dot}/>Ativo</span>}</div><p>{flow.description||"Sem descrição"}</p><div className={styles.meta}><span>{flow.step_count||0} blocos</span><span>{flow.run_count||0} execuções</span></div></div></div><div className={styles.actions}><button className={`${styles.buttonSecondary} ${styles.buttonSmall}`} onClick={()=>openEditor(flow.id)}>Editar</button><button className={`${styles.buttonGhost} ${styles.buttonSmall}`} onClick={()=>{setSim((s:any)=>({...s,flowId:flow.id}));setView("test")}}><PlayCircle size={13}/> Testar</button><button className={styles.iconButton} onClick={()=>deleteFlow(flow.id)}><Trash2 size={14}/></button></div></div>)}</div>}
      </section>}

      {view==="leads"&&<section className={styles.page}><div className={styles.heading}><div><span className={styles.eyebrow}>LEADS</span><h1>Contatos capturados</h1><p>Todo direcionamento gerado pelo fluxo aparece aqui automaticamente.</p></div></div><LeadTable leads={leads} onStatus={changeLeadStatus}/></section>}

      {view==="team"&&<section className={styles.page}>
        <div className={styles.heading}><div><span className={styles.eyebrow}>EQUIPE</span><h1>Destinos do atendimento</h1><p>Cadastre os números que receberão clientes vindos dos fluxos.</p></div></div>
        <div className={styles.teamGrid}>{team.map(member=><div className={styles.teamCard} key={member.id}><div className={styles.teamCardTop}><div className={styles.teamIdentity}><div className={styles.teamAvatar}>{initials(member.name)}</div><div><h3>{member.name}</h3><span>{member.department} · {member.role}</span></div></div><span className={`${styles.pill} ${member.active?styles.pillOn:""}`}>{member.active?"Ativo":"Inativo"}</span></div><p>{member.phone||"Sem número configurado"}</p><div className={styles.actions} style={{marginTop:14}}><button className={`${styles.buttonSecondary} ${styles.buttonSmall}`} onClick={()=>setEditingMember(member)}>Editar</button><button className={`${styles.buttonDanger} ${styles.buttonSmall}`} onClick={()=>deleteMember(member.id)}>Excluir</button></div></div>)}</div>
        <div className={styles.editBox}><div className={styles.editBoxHeader}><h3>Adicionar destino</h3></div><div className={styles.formGrid3}><Field label="Nome"><input className={styles.input} value={newMember.name} onChange={e=>setNewMember({...newMember,name:e.target.value})}/></Field><Field label="Departamento"><input className={styles.input} value={newMember.department} onChange={e=>setNewMember({...newMember,department:e.target.value})}/></Field><Field label="Função"><input className={styles.input} value={newMember.role} onChange={e=>setNewMember({...newMember,role:e.target.value})}/></Field><Field label="WhatsApp" hint="Use DDI + DDD + número, ex.: 5511999999999"><input className={styles.input} value={newMember.phone} onChange={e=>setNewMember({...newMember,phone:e.target.value})}/></Field></div><button className={styles.buttonPrimary} style={{marginTop:14}} onClick={addMember}><Plus size={15}/> Adicionar</button></div>
        {editingMember&&<div className={styles.editBox}><div className={styles.editBoxHeader}><h3>Editar {editingMember.name}</h3><button className={styles.iconButton} onClick={()=>setEditingMember(null)}><X size={15}/></button></div><div className={styles.formGrid}><Field label="Nome"><input className={styles.input} value={editingMember.name} onChange={e=>setEditingMember({...editingMember,name:e.target.value})}/></Field><Field label="Departamento"><input className={styles.input} value={editingMember.department} onChange={e=>setEditingMember({...editingMember,department:e.target.value})}/></Field><Field label="Função"><input className={styles.input} value={editingMember.role} onChange={e=>setEditingMember({...editingMember,role:e.target.value})}/></Field><Field label="WhatsApp"><input className={styles.input} value={editingMember.phone||""} onChange={e=>setEditingMember({...editingMember,phone:e.target.value})}/></Field></div><div className={styles.actions} style={{marginTop:14}}><button className={styles.buttonPrimary} onClick={saveMember}><Save size={14}/> Salvar</button><button className={styles.buttonSecondary} onClick={()=>setEditingMember({...editingMember,active:!editingMember.active})}>{editingMember.active?"Desativar":"Ativar"}</button></div></div>}
      </section>}

      {view==="test"&&<section className={`${styles.page} ${styles.narrow}`}>
        <div className={styles.heading}><div><span className={styles.eyebrow}>SIMULADOR</span><h1>Teste o fluxo antes de publicar</h1><p>A conversa usa o mesmo motor de fluxo que gera leads e direcionamentos no banco.</p></div><div className={styles.actions}><select className={styles.select} style={{minWidth:220}} value={sim.flowId} onChange={e=>setSim({...sim,flowId:e.target.value,runId:"",messages:[],redirect:null})}>{flows.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><button className={styles.buttonPrimary} onClick={startSim}><PlayCircle size={16}/> Iniciar</button></div></div>
        <div className={styles.simLayout}><div className={styles.phoneFrame}><div className={styles.phoneScreen}><div className={styles.phoneHeader}><div className={styles.phoneHeaderAvatar}>P</div><div><strong>{workspace?.name||"Empresa"}</strong><span>Atendimento automatizado</span></div></div><div className={styles.chat}>{sim.messages.length===0&&<div className={styles.empty}><strong>Conversa vazia</strong><p>Clique em “Iniciar” para executar o fluxo.</p></div>}{sim.messages.map((m:any,i:number)=><div className={`${styles.bubbleRow} ${m.direction==="in"?styles.bubbleRowUser:""}`} key={i}><div className={`${styles.bubble} ${m.direction==="in"?styles.bubbleUser:""}`}>{m.body}{m.url&&<><br/><a href={m.url} target="_blank">Abrir link</a></>}</div></div>)}{sim.awaiting==="menu"&&<div className={styles.menuButtons}>{sim.options.map((o:any,i:number)=><button className={styles.menuButton} key={i} onClick={()=>sendSim(o.label,o.value)}>{i+1}. {o.label}</button>)}</div>}</div><div className={styles.chatComposer}><input className={styles.input} placeholder={sim.awaiting?"Digite uma resposta...":"Inicie um fluxo"} value={sim.input} disabled={!sim.awaiting||sim.awaiting==="menu"} onChange={e=>setSim({...sim,input:e.target.value})} onKeyDown={e=>{if(e.key==="Enter")sendSim()}}/><button disabled={!sim.awaiting||sim.awaiting==="menu"} onClick={()=>sendSim()}><Send size={15}/></button></div></div></div><div className={styles.simControls}><div className={`${styles.panel} ${styles.panelPad}`}><span className={styles.eyebrow}>EXECUÇÃO</span><h3 className={styles.sectionTitle} style={{marginTop:8}}>{sim.runId?"Teste em andamento":"Pronto para testar"}</h3><div className={styles.statusGrid}><div className={styles.statusItem}><span>Run ID</span><strong>{sim.runId?sim.runId.slice(0,8):"—"}</strong></div><div className={styles.statusItem}><span>Estado</span><strong>{sim.redirect?"Direcionado":sim.awaiting?"Aguardando resposta":"—"}</strong></div></div></div>{sim.redirect&&<div className={styles.redirectCard}><h3>Direcionamento criado</h3><p>Destino: <strong>{sim.redirect.destination}</strong><br/>{sim.redirect.phone?`WhatsApp: ${sim.redirect.phone}`:"Configure o número desse destino na aba Equipe."}</p>{sim.redirect.url&&<a className={styles.buttonPrimary} href={sim.redirect.url} target="_blank" rel="noreferrer">Abrir WhatsApp <ExternalLink size={14}/></a>}</div>}<div className={styles.helper}><strong>Como validar</strong><p>Preencha primeiro o WhatsApp do vendedor em Equipe. Depois rode “Solicitar orçamento”. Ao final, o lead será salvo e o botão abrirá o WhatsApp do destino com a mensagem pronta.</p></div></div></div>
      </section>}

      {view==="whatsapp"&&<section className={`${styles.page} ${styles.narrow}`}><div className={styles.heading}><div><span className={styles.eyebrow}>WHATSAPP</span><h1>Canal oficial</h1><p>O endpoint público já está preparado para a Meta. Enquanto não houver credenciais, o simulador usa o mesmo motor de fluxo.</p></div></div><div className={`${styles.panel} ${styles.panelPad}`}><div className={styles.panelHeader}><div><span className={styles.eyebrow}>STATUS</span><h2>{wa?.configured?"WhatsApp configurado":"Aguardando credenciais da Meta"}</h2></div><span className={`${styles.pill} ${wa?.configured?styles.pillOn:styles.pillPurple}`}><span className={styles.dot}/>{wa?.configured?"Conectado":"Modo teste"}</span></div><div className={styles.notice} style={{marginTop:18}}>Webhook público</div><div className={styles.webhookBox}><input className={styles.input} readOnly value={wa?.webhookUrl||""}/><button className={styles.iconButton} onClick={()=>{navigator.clipboard.writeText(wa?.webhookUrl||"");showToast("Webhook copiado")}}><Copy size={15}/></button></div><div className={styles.helper}><strong>Para ativar mensagens reais</strong><p>Precisamos de WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID da Meta. Essas credenciais ficam somente no Railway e nunca no navegador.</p></div></div></section>}

      {view==="settings"&&<section className={`${styles.page} ${styles.narrow}`}><div className={styles.heading}><div><span className={styles.eyebrow}>CONFIGURAÇÕES</span><h1>Workspace</h1><p>Dados gerais da empresa e segurança do acesso.</p></div></div><div className={styles.settingsGrid}><div className={`${styles.panel} ${styles.panelPad}`}><h3 className={styles.sectionTitle}>Empresa</h3><Field label="Nome da empresa"><input className={styles.input} value={workspace?.name||""} onChange={e=>setWorkspace({...workspace,name:e.target.value})}/></Field><div style={{height:12}}/><Field label="WhatsApp principal"><input className={styles.input} value={workspace?.main_phone||""} onChange={e=>setWorkspace({...workspace,main_phone:e.target.value})}/></Field><button className={styles.buttonPrimary} style={{marginTop:14}} onClick={saveWorkspace}><Save size={14}/> Salvar</button></div><div className={`${styles.panel} ${styles.panelPad}`}><h3 className={styles.sectionTitle}>Trocar senha</h3>{user?.must_change_password&&<div className={styles.notice}>Recomendado: altere a senha inicial antes de divulgar o painel.</div>}<Field label="Senha atual"><input className={styles.input} type="password" value={passwords.current} onChange={e=>setPasswords({...passwords,current:e.target.value})}/></Field><div style={{height:12}}/><Field label="Nova senha"><input className={styles.input} type="password" value={passwords.next} onChange={e=>setPasswords({...passwords,next:e.target.value})}/></Field><button className={styles.buttonPrimary} style={{marginTop:14}} onClick={changePassword}><Save size={14}/> Alterar senha</button></div></div><div className={styles.copyright}>© 2026 ogabrieltech. Todos os direitos reservados.</div></section>}
    </section>

    <nav className={styles.mobileNav}>{navItems.map(([id,label,Icon])=><button key={id} data-active={view===id} onClick={()=>setView(id as View)}><Icon size={17}/><span>{label}</span></button>)}</nav>
    {toast&&<div className={styles.toast}>{toast}</div>}
  </main>;
}

function Stat({icon:Icon,label,value,note}:{icon:any;label:string;value:any;note:string}){return <div className={styles.stat}><div className={styles.statIcon}><Icon size={18}/></div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>}
function Preview({icon:Icon,label}:{icon:any;label:string}){return <div className={styles.previewStep}><div className={styles.previewIcon}><Icon size={15}/></div><span>{label}</span></div>}
function Field({label,hint,children}:{label:string;hint?:string;children:any}){return <div className={styles.field}><label>{label}</label>{children}{hint&&<small>{hint}</small>}</div>}

function LeadTable({leads,onStatus}:{leads:Lead[];onStatus:(id:string,status:string)=>void}){return <div className={`${styles.panel} ${styles.tableWrap}`}><table className={styles.table}><thead><tr><th>Contato</th><th>Interesse</th><th>Destino</th><th>Status</th><th>Entrada</th></tr></thead><tbody>{leads.length===0?<tr><td colSpan={5}>Nenhum lead ainda. Execute um fluxo no simulador.</td></tr>:leads.map(l=><tr key={l.id}><td><div className={styles.contact}><div className={styles.contactAvatar}>{initials(l.name)}</div><div><strong>{l.name}</strong><span>{l.phone||"Sem telefone"}</span></div></div></td><td>{l.interest||"—"}</td><td>{l.destination||"—"}</td><td><select className={styles.select} style={{height:31,minWidth:130}} value={l.status} onChange={e=>onStatus(l.id,e.target.value)}><option>Novo</option><option>Direcionado</option><option>Em atendimento</option><option>Concluído</option><option>Perdido</option></select></td><td>{formatDate(l.created_at)}</td></tr>)}</tbody></table></div>}

function FlowEditor({editor,setEditor,team,addBlock,patchStep,patchConfig,moveStep,removeStep,save,cancel}:{editor:{flow:Flow;steps:FlowStep[]};setEditor:any;team:Member[];addBlock:any;patchStep:any;patchConfig:any;moveStep:any;removeStep:any;save:any;cancel:any}){
  function iconFor(type:FlowStepType){return blockCatalog.find(x=>x.type===type)?.icon||MessageSquareText}
  function setOption(stepIndex:number,optIndex:number,patch:any){const options=[...(editor.steps[stepIndex].config.options||[])];options[optIndex]={...options[optIndex],...patch};patchConfig(stepIndex,{options})}
  function addOption(stepIndex:number){const options=[...(editor.steps[stepIndex].config.options||[]),{label:"Nova opção",value:`opcao_${Date.now()}`,next_position:stepIndex+2}];patchConfig(stepIndex,{options})}
  function removeOption(stepIndex:number,optIndex:number){patchConfig(stepIndex,{options:(editor.steps[stepIndex].config.options||[]).filter((_:any,i:number)=>i!==optIndex)})}
  return <div className={styles.editorLayout}><div><div className={styles.editBox} style={{marginTop:0,marginBottom:14}}><div className={styles.formGrid}><Field label="Nome do fluxo"><input className={styles.input} value={editor.flow.name} onChange={e=>setEditor({...editor,flow:{...editor.flow,name:e.target.value}})}/></Field><Field label="Descrição"><input className={styles.input} value={editor.flow.description||""} onChange={e=>setEditor({...editor,flow:{...editor.flow,description:e.target.value}})}/></Field></div><label style={{display:"flex",gap:8,alignItems:"center",fontSize:10,fontWeight:800,marginTop:13}}><input type="checkbox" checked={editor.flow.active} onChange={e=>setEditor({...editor,flow:{...editor.flow,active:e.target.checked}})}/> Fluxo ativo</label></div><div className={styles.builderList}>{editor.steps.map((step,index)=>{const Icon=iconFor(step.type);return <div className={styles.block} key={step.id||`${step.type}-${index}`}><div className={styles.blockTop}><div className={styles.blockIdentity}><div className={styles.blockTypeIcon}><Icon size={16}/></div><div><strong>{index+1}. {step.title||step.type}</strong><span>{blockCatalog.find(x=>x.type===step.type)?.label}</span></div></div><div className={styles.blockActions}><button className={styles.iconButton} onClick={()=>moveStep(index,-1)}><ArrowUp size={13}/></button><button className={styles.iconButton} onClick={()=>moveStep(index,1)}><ArrowDown size={13}/></button><button className={styles.iconButton} onClick={()=>removeStep(index)}><Trash2 size={13}/></button></div></div><div className={styles.blockForm}><Field label="Título interno"><input className={styles.input} value={step.title||""} onChange={e=>patchStep(index,{title:e.target.value})}/></Field>
      {step.type==="message"&&<Field label="Mensagem"><textarea className={styles.textarea} value={step.config.text||""} onChange={e=>patchConfig(index,{text:e.target.value})}/></Field>}
      {step.type==="question"&&<><Field label="Pergunta"><textarea className={styles.textarea} value={step.config.prompt||""} onChange={e=>patchConfig(index,{prompt:e.target.value})}/></Field><Field label="Salvar resposta como"><select className={styles.select} value={step.config.field||"answer"} onChange={e=>patchConfig(index,{field:e.target.value})}><option value="name">Nome</option><option value="phone">Telefone</option><option value="interest">Interesse</option><option value="city">Cidade</option><option value="answer">Resposta</option></select></Field></>}
      {step.type==="menu"&&<><div className={styles.blockFormFull}><Field label="Texto do menu"><input className={styles.input} value={step.config.prompt||""} onChange={e=>patchConfig(index,{prompt:e.target.value})}/></Field></div><div className={styles.menuOptions}>{(step.config.options||[]).map((o:any,oi:number)=><div className={styles.optionRow} key={oi}><input className={styles.input} value={o.label} onChange={e=>setOption(index,oi,{label:e.target.value})}/><input className={styles.input} type="number" min={1} max={editor.steps.length+1} value={o.next_position||1} onChange={e=>setOption(index,oi,{next_position:Number(e.target.value)})}/><button className={styles.iconButton} onClick={()=>removeOption(index,oi)}><X size={13}/></button></div>)}<button className={`${styles.buttonGhost} ${styles.buttonSmall}`} onClick={()=>addOption(index)}><Plus size={12}/> Adicionar opção</button><small>O número à direita indica para qual bloco a opção deve seguir.</small></div></>}
      {step.type==="redirect"&&<><Field label="Departamento"><select className={styles.select} value={step.config.department||"Comercial"} onChange={e=>patchConfig(index,{department:e.target.value})}>{Array.from(new Set(team.map(t=>t.department))).map(dep=><option key={dep}>{dep}</option>)}</select></Field><Field label="Mensagem antes de direcionar"><textarea className={styles.textarea} value={step.config.text||""} onChange={e=>patchConfig(index,{text:e.target.value})}/></Field></>}
      {step.type==="business_hours"&&<><Field label="Mensagem quando aberto"><input className={styles.input} value={step.config.open_text||""} onChange={e=>patchConfig(index,{open_text:e.target.value})}/></Field><Field label="Mensagem quando fechado"><input className={styles.input} value={step.config.closed_text||""} onChange={e=>patchConfig(index,{closed_text:e.target.value})}/></Field></>}
      {step.type==="link"&&<><Field label="Texto"><input className={styles.input} value={step.config.text||""} onChange={e=>patchConfig(index,{text:e.target.value})}/></Field><Field label="URL"><input className={styles.input} value={step.config.url||""} onChange={e=>patchConfig(index,{url:e.target.value})}/></Field></>}
    </div></div>})}</div></div><aside className={styles.stickyPanel}><div className={`${styles.panel} ${styles.panelPad}`}><h3 className={styles.sectionTitle}>Adicionar bloco</h3><div className={styles.addBlockGrid}>{blockCatalog.map(({type,label,icon:Icon})=><button key={type} className={styles.addBlockButton} onClick={()=>addBlock(type)}><Icon size={14}/>{label}</button>)}</div><div className={styles.helper}><strong>Ordem dos blocos</strong><p>Use as setas para reorganizar. No menu, a opção aponta para o número do bloco de destino.</p></div><div className={styles.actions} style={{marginTop:14}}><button className={styles.buttonPrimary} onClick={save}><Save size={14}/> Salvar fluxo</button><button className={styles.buttonSecondary} onClick={cancel}>Cancelar</button></div></div></aside></div>
}
