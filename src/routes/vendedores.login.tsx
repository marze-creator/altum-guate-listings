import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
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
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bienvenido");
    nav({ to: "/vendedores/dashboard" });
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/vendedores/dashboard` });
    if (r.error) toast.error("Error con Google");
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-20 bg-muted">
      <div className="w-full max-w-md bg-card border border-border rounded-sm shadow-elegant p-10">
        <div className="text-center mb-8">
          <img src={logo} alt="ALTUM GROUP" className="h-16 mx-auto" width={160} height={64} />
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-secondary font-semibold">Portal Profesional</p>
          <h1 className="font-display text-2xl text-primary mt-1">Acceso Vendedores</h1>
        </div>

        <button onClick={google} type="button" className="w-full h-11 mb-4 border border-border rounded-sm font-semibold text-sm hover:bg-muted">
          Continuar con Google
        </button>
        <div className="relative my-4 text-center">
          <span className="bg-card px-2 text-xs text-muted-foreground relative z-10">o</span>
          <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
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
          <button disabled={loading} type="submit" className="w-full h-11 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85 disabled:opacity-50">
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          ¿Aún no eres vendedor? <Link to="/vendedores/signup" className="text-primary hover:text-secondary font-semibold">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}
