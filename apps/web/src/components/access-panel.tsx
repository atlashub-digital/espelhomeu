"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
type Challenge = { id: string; method: "otp" | "magic_link" };
export function AccessPanel({ canBind = false }: { canBind?: boolean }) {
  const router = useRouter();
  const channel = "email";
  const [remaining, setRemaining] = useState(0);
  const [authenticated, setAuthenticated] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [link, setLink] = useState<{ id: string; token: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  useEffect(() => {
    if (!resendAt) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);
  useEffect(() => {
    let mounted = true;
    function readLink() {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const id = params.get("access_challenge"), token = params.get("access_token");
      if (id && token) {
        setLink({ id, token });
        setAuthenticated(false);
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
    async function load() {
      const response = await fetch("/api/access/session", { cache: "no-store" }).catch(() => null);
      if (!mounted) return;
      setAuthenticated(response?.ok === true);
      // Fragment never reaches the server or Referer; reading it does not consume it.
      readLink();
    }
    window.addEventListener("hashchange", readLink);
    void load();
    return () => { mounted = false; window.removeEventListener("hashchange", readLink); };
  }, []);
  async function post(path: string, data: unknown) {
    return fetch("/api/access/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  }
  async function requestChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Date.now() < resendAt) { setMessage("Aguarde um minuto antes de pedir outro código ou link."); return; }
    const data = new FormData(event.currentTarget);
    setBusy(true); setMessage("");
    try {
      const method = "otp" as const;
      const response = await post("challenges", { project: "espelhomeu", channel, method, identifier: data.get("email") });
      if (!response.ok) throw new Error();
      const result = await response.json();
      setChallenge({ id: result.challenge_id, method });
      setResendAt(Date.now() + Math.max(60, Number(result.resend_after) || 60) * 1000);
      setMessage("Se for possível continuar, receberá um código válido por 5 minutos.");
    } catch { setMessage("Não foi possível continuar. Tente novamente mais tarde."); }
    finally { setBusy(false); }
  }
  async function verify(id: string, secret: string) {
    setBusy(true); setMessage("");
    try {
      const response = await post("challenges/verify", { project: "espelhomeu", challenge_id: id, secret });
      if (!response.ok) throw new Error();
      setAuthenticated(true); setLink(null); setChallenge(null);
      setMessage("Identidade confirmada. As suas leituras dependem do acesso à compra.");
      router.refresh();
    } catch { setMessage("Código inválido ou expirado. Solicite um novo."); }
    finally { setBusy(false); }
  }
  async function activate() {
    setBusy(true); setMessage("");
    try {
      const response = await post("bind", {});
      if (!response.ok) throw new Error();
      setMessage("Recuperação ativada. Noutro dispositivo, entre com este mesmo contacto para abrir as suas leituras.");
      router.refresh();
    } catch { setMessage("Não foi possível ativar a recuperação. Confirme que a compra continua disponível neste dispositivo e tente novamente."); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try {
      const response = await post("logout", {});
      if (!response.ok) throw new Error();
      setAuthenticated(false); setChallenge(null); setLink(null); setMessage("Sessão terminada neste dispositivo."); router.refresh();
    } catch { setMessage("Não foi possível terminar a sessão. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <section className="page-intro" aria-label="Acesso à Biblioteca" aria-busy={busy}>
    <h2>{canBind ? "Ativar recuperação" : authenticated ? "A sua sessão" : "Entrar na Biblioteca"}</h2>
    {authenticated ? <>{canBind && <button className="button" disabled={busy} onClick={activate}>Ativar recuperação com este contacto</button>}<p>Sessão por até 7 dias. Entrar confirma o seu contacto; cada leitura mantém a verificação de acesso à compra.</p><button className="button" disabled={busy} onClick={async () => { const r = await post("opt-out", {}); setMessage(r.ok ? "Pedidos por WhatsApp desativados. Pode usar e-mail." : "Esta opção requer uma sessão verificada por WhatsApp."); }}>Desativar pedidos por WhatsApp</button><button className="button" disabled={busy} onClick={logout}>Sair deste dispositivo</button></> : <>
      <p>{canBind ? "Confirme o seu e-mail e ative a recuperação para abrir esta compra noutro dispositivo." : "Use o e-mail associado à sua compra para recuperar o acesso, sem palavra-passe."}</p>
      {link ? <button className="button" disabled={busy} onClick={() => verify(link.id, link.token)}>Confirmar entrada pelo link</button> : <>
        <form className="catalog-filter" onSubmit={requestChallenge}>
          <label>Canal<select defaultValue="email"><option value="email">E-mail</option><option value="whatsapp" disabled>WhatsApp — em breve</option></select></label>
          <label>E-mail<input name="email" type="email" autoComplete="email" autoFocus maxLength={254} required readOnly={busy} /></label>
          <button className="button" disabled={busy || remaining > 0} type="submit">{busy ? "A enviar…" : remaining > 0 ? `Reenviar em ${remaining}s` : challenge ? "Solicitar novo código" : "Continuar"}</button>
        </form>
        {challenge?.method === "otp" && <form className="catalog-filter" onSubmit={event => { event.preventDefault(); void verify(challenge.id, String(new FormData(event.currentTarget).get("code"))); }}>
          <label>Código de 6 dígitos<input key={challenge.id} autoFocus name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required /></label>
          <button className="button" disabled={busy} type="submit">{busy ? "A confirmar…" : "Confirmar código"}</button>
        </form>}
      </>}
    </>}
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}

export function RecoveryPanel() {
  const [open, setOpen] = useState(false);
  return <div>
    <button className="button" type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>Já comprei? Recuperar acesso</button>
    {open && <AccessPanel />}
  </div>;
}
