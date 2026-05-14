import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/altum-logo.png";

export const Route = createFileRoute("/vendedores/login")({
  head: () => ({
    meta: [
      { title: "Acceso Vendedores — ALTUM GROUP" },
      { name: "description", content: "Portal profesional ALTUM GROUP para asesores certificados." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("Portal de vendedores próximamente. Activaremos autenticación con Lovable Cloud.");
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-20 bg-muted">
      <div className="w-full max-w-md bg-card border border-border rounded-sm shadow-elegant p-10">
        <div className="text-center mb-8">
          <img src={logo} alt="ALTUM GROUP" className="h-16 mx-auto" width={160} height={64} />
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-secondary font-semibold">Portal Profesional</p>
          <h1 className="font-display text-2xl text-primary mt-1">Acceso Vendedores</h1>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Correo</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full h-11 px-3 border border-border rounded-sm bg-background" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Contraseña</span>
            <input type="password" required value={pwd} onChange={(e) => setPwd(e.target.value)} className="mt-1 w-full h-11 px-3 border border-border rounded-sm bg-background" />
          </label>
          <button type="submit" className="w-full h-11 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85">
            Iniciar Sesión
          </button>
          {msg && <p className="text-xs text-center text-muted-foreground">{msg}</p>}
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          ¿No eres vendedor? <Link to="/" className="text-primary hover:text-secondary font-semibold">Volver al inicio</Link>
        </p>
      </div>
    </div>
  );
}
