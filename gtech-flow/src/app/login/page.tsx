"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@puxai.local");
  const [password, setPassword] = useState("Puxai#Teste2026!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/puxai/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha no login");
      router.replace("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar");
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
          <span>ACESSO AO PAINEL</span>
          <h2>Entrar no Puxaí</h2>
          <p>Use sua conta administrativa para configurar os fluxos e testar o atendimento.</p>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.field}><label>E-mail</label><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="username" required/></div>
          <div className={styles.field}><label>Senha</label><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="current-password" required/></div>
          <button className={styles.button} disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
          <p className={styles.hint}>Conta inicial de teste preenchida automaticamente. Troque a senha em <code>Configurações</code>.</p>
        </form>
      </section>
    </main>
  );
}
