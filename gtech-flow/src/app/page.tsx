import Link from "next/link";
import { ArrowRight, Clock3, GitBranch, ListChecks, MessageCircle, Send, ShieldCheck, UsersRound } from "lucide-react";
import styles from "./landing.module.css";

const features = [
  { icon: GitBranch, title: "Fluxos sem complicação", text: "Monte caminhos de atendimento por etapas: mensagem, menu, perguntas, horário e direcionamento." },
  { icon: Send, title: "Direcione para a pessoa certa", text: "Orçamento vai para vendas. Financeiro vai para financeiro. Suporte chega no responsável certo." },
  { icon: ListChecks, title: "Colete antes de encaminhar", text: "Nome, produto, quantidade, cidade ou qualquer dado que seu vendedor precisa para começar bem o atendimento." },
  { icon: Clock3, title: "Respeite o horário da empresa", text: "Crie respostas e caminhos diferentes dentro ou fora do expediente, sem deixar o cliente no vazio." },
  { icon: UsersRound, title: "Organize sua equipe", text: "Cadastre vendedores e setores como destinos dos fluxos e acompanhe para onde cada contato foi enviado." },
  { icon: ShieldCheck, title: "Estrutura oficial", text: "Projeto preparado para usar a API oficial do WhatsApp Business, com webhook e operação centralizada." },
];

const useCases = [
  ["Lojas e distribuidores", "Orçamentos, produtos, estoque e vendedores."],
  ["Clínicas e serviços", "Agendamento, dúvidas e encaminhamento por especialidade."],
  ["Imobiliárias", "Captação do interesse e distribuição entre corretores."],
  ["Escritórios e suporte", "Triagem por assunto antes do atendimento humano."],
];

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <header className={styles.container}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.brand} aria-label="Puxaí - início">
            <span className={styles.brandMark}>P</span>
            <span>Puxaí <small>by ogabrieltech</small></span>
          </Link>
          <div className={styles.navLinks}>
            <a href="#recursos">Recursos</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#para-quem">Para quem é</a>
          </div>
          <div className={styles.navActions}>
            <Link href="/app" className={styles.secondary}>Ver painel</Link>
            <Link href="/app" className={styles.primary}>Testar Puxaí <ArrowRight size={15}/></Link>
          </div>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.badge}><span className={styles.badgeDot}/> Atendimento organizado. Sem IA. Sem complicação.</div>
          <h1>Seu WhatsApp recebe.<br/><span>O Puxaí direciona.</span></h1>
          <p>Automatize o primeiro atendimento, colete as informações que importam e leve cada cliente direto para o vendedor ou setor responsável.</p>
          <div className={styles.heroActions}>
            <Link href="/app" className={styles.primaryLarge}>Ver demonstração <ArrowRight size={18}/></Link>
            <a href="#como-funciona" className={styles.secondary}>Entender como funciona</a>
          </div>
          <p className={styles.microcopy}>Feito para pequenas e médias empresas que vivem no WhatsApp.</p>
        </div>
      </section>

      <section className={styles.previewWrap}>
        <div className={styles.previewGlow}/>
        <div className={styles.container}>
          <div className={styles.preview}>
            <div className={styles.browserBar}><i/><i/><i/><div className={styles.browserUrl}>app.puxai.com.br/dashboard</div></div>
            <div className={styles.dashboard}>
              <aside className={styles.side}>
                <div className={styles.sideLogo}><b>P</b>Puxaí</div>
                <div className={styles.sideNav}><span>Dashboard</span><span>Automações</span><span>Leads</span><span>Equipe</span><span>WhatsApp</span><span>Configurações</span></div>
              </aside>
              <div className={styles.dashMain}>
                <div className={styles.dashHeader}><div><small>VISÃO GERAL</small><h3>Bom dia, Gabriel.</h3></div><button className={styles.newFlow}>+ Nova automação</button></div>
                <div className={styles.metricGrid}>
                  <div className={styles.metric}><span>ATENDIMENTOS</span><strong>128</strong></div>
                  <div className={styles.metric}><span>ORÇAMENTOS</span><strong>24</strong></div>
                  <div className={styles.metric}><span>DIRECIONAMENTOS</span><strong>41</strong></div>
                  <div className={styles.metric}><span>TAXA DE AÇÃO</span><strong>31%</strong></div>
                </div>
                <div className={styles.dashGrid}>
                  <div className={styles.dashCard}><div className={styles.dashCardTitle}><strong>Atendimentos por dia</strong><span className={styles.live}>Esta semana</span></div><div className={styles.bars}>{[42,58,49,74,66,82,71].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div></div>
                  <div className={styles.dashCard}><div className={styles.dashCardTitle}><strong>Atendimento comercial</strong><span className={styles.live}>● Ativa</span></div><div className={styles.flow}><div className={styles.flowStep}><b>1</b>Boas-vindas</div><div className={styles.flowStep}><b>2</b>Menu principal</div><div className={styles.flowStep}><b>3</b>Coletar dados</div><div className={styles.flowStep}><b>4</b>Direcionar vendedor</div></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="recursos">
        <div className={styles.container}>
          <div className={styles.sectionHead}><span className={styles.eyebrow}>RECURSOS</span><h2>Automação que resolve o básico muito bem.</h2><p>Sem transformar seu atendimento em um robô confuso. O Puxaí organiza a entrada e entrega o cliente para quem realmente vai atendê-lo.</p></div>
          <div className={styles.features}>{features.map(({icon:Icon,title,text})=><article className={styles.feature} key={title}><div className={styles.featureIcon}><Icon size={20}/></div><h3>{title}</h3><p>{text}</p></article>)}</div>
        </div>
      </section>

      <section className={styles.workflow} id="como-funciona">
        <div className={styles.container}>
          <div className={styles.sectionHead}><span className={styles.eyebrow}>COMO FUNCIONA</span><h2>Do “oi” ao vendedor certo em quatro passos.</h2><p>Você define o caminho uma vez. O Puxaí executa a triagem sempre que um novo atendimento começa.</p></div>
          <div className={styles.steps}>
            <article className={styles.step}><div className={styles.stepNumber}>01</div><h3>Cliente chama</h3><p>O contato chega pelo WhatsApp principal da empresa.</p></article>
            <article className={styles.step}><div className={styles.stepNumber}>02</div><h3>Puxaí identifica</h3><p>O fluxo pergunta o motivo do contato e coleta os dados necessários.</p></article>
            <article className={styles.step}><div className={styles.stepNumber}>03</div><h3>Fluxo decide</h3><p>Orçamento, financeiro, suporte ou qualquer rota que você configurar.</p></article>
            <article className={styles.step}><div className={styles.stepNumber}>04</div><h3>Equipe recebe</h3><p>O cliente segue para a pessoa certa com a conversa já contextualizada.</p></article>
          </div>
        </div>
      </section>

      <section className={styles.section} id="para-quem">
        <div className={styles.container}>
          <div className={`${styles.sectionHead} ${styles.center}`}><span className={styles.eyebrow}>PARA QUEM É</span><h2>Se sua empresa atende pelo WhatsApp, já existe um fluxo para organizar.</h2></div>
          <div className={styles.useCases}>{useCases.map(([title,text])=><div className={styles.useCase} key={title}><strong>{title}</strong><span>{text}</span></div>)}</div>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.container}>
          <div className={styles.ctaBox}><div><h2>Pare de encaminhar atendimento na mão.</h2><p>Crie o caminho uma vez e deixe o Puxaí fazer a triagem.</p></div><Link href="/app" className={styles.ctaButton}>Conhecer o painel <ArrowRight size={17}/></Link></div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerRow}`}>
          <div><Link href="/" className={styles.brand}><span className={styles.brandMark}>P</span><span>Puxaí <small>by ogabrieltech</small></span></Link></div>
          <p>© 2026 ogabrieltech. Todos os direitos reservados.</p>
          <div className={styles.footerLinks}><a href="#recursos">Recursos</a><a href="#como-funciona">Como funciona</a><Link href="/app">Painel</Link></div>
        </div>
      </footer>
    </main>
  );
}
