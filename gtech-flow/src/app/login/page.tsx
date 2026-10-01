"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [token, setToken] = useState("");
  const [name, setName] = useState("Gabriel");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/setup", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Falha ao verificar configuração");
        setNeedsSetup(Boolean(data.needsSetup));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Não foi possível verificar o sistema");
        setNeedsSetup(false);
      });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(needsSetup ? "/api/setup" : "/api/puxai/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(needsSetup ? { token, name, email, password } : { email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (needsSetup ? "Falha na configuração" : "Falha no login"));
      router.replace("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível continuar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.brandSide}>
        <div className={styles.brand}><div className={styles.mark}>P</div><strong>PUXAÍ</strong></div>
        <div className={styles.copy}>
          <span>AUTOMAÇÃO DE ATENDIMENTO</span>
          <h1>Seu WhatsApp recebe. O Puxaí direciona.</h1>
          <p>Crie fluxos, organize sua equipe, capture leads e envie cada cliente para a pessoa certa.</p>
        </div>
        <div className={styles.footer}>© 2026 ogabrieltech. Todos os direitos reservados.</div>
      </section>
      <section className={styles.formSide}>
        <form className={styles.card} onSubmit={submit}>
          <span>{needsSetup ? "PRIMEIRO ACESSO" : "ACESSO AO PAINEL"}</span>
          <h2>{needsSetup ? "Crie seu administrador" : "Entrar no Puxaí"}</h2>
          <p>{needsSetup ? "Use o token único de configuração e defina suas credenciais. O token será invalidado após este cadastro." : "Entre com sua conta administrativa para configurar os fluxos e acompanhar os atendimentos."}</p>
          {error && <div className={styles.error}>{error}</div>}
          {needsSetup === null ? <p>Verificando configuração do sistema...</p> : <>
            {needsSetup && <>
              <div className={styles.field}><label>Token de configuração</label><input value={token} onChange={(e)=>setToken(e.target.value)} autoComplete="off" placeholder="Cole o token informado no deploy" required/></div>
              <div className={styles.field}><label>Seu nome</label><input value={name} onChange={(e)=>setName(e.target.value)} autoComplete="name" required/></div>
            </>}
            <div className={styles.field}><label>E-mail</label><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="username" required/></div>
            <div className={styles.field}><label>{needsSetup ? "Crie uma senha" : "Senha"}</label><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete={needsSetup ? "new-password" : "current-password"} minLength={needsSetup ? 10 : undefined} required/></div>
            <button className={styles.button} disabled={loading}>{loading ? "Processando..." : needsSetup ? "Criar administrador" : "Entrar"}</button>
            {needsSetup && <p className={styles.hint}>A senha precisa ter pelo menos 10 caracteres. O Puxaí não armazena a senha em texto puro.</p>}
          </>}
        </form>
      </section>
    </main>
  );
}
