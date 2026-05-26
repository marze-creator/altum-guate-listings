import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import logo from "@/assets/altum-logo.png";

export const Route = createFileRoute("/vendedores/signup")({
  head: () => ({
    meta: [
      { title: "Registro Vendedores — ALTUM GROUP" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: ${window.location.origin}/vendedores/dashboard,
        data: { full_name: form.name, phone: form.phone },
      },
    });
    
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    
    if (data.user) {
      const reasonText = form.reason 
        ? Solicitud acceso vendedor — ${form.name}: ${form.reason}
        : Solicitud acceso vendedor — ${form.name};
        
      await supabase.from("admin_requests").insert({ 
        user_id: data.user.id, 
        reason: reasonText,
        status: "pending"
      });
    }
    
    setSuccess(true);
    toast.success("Cuenta creada. Solicitud enviada al equipo ALTUM.");
    setLoading(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { 
      redirect_uri: ${window.location.origin}/vendedores/dashboard 
    });
    if (r.error) toast.error("Error con Google");
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-20 bg-muted">
        <div className="w-full max-w-md bg-card border border-border rounded-sm shadow-elegant p-10 text-center">
          <img src={logo} alt="ALTUM GROUP" className="h-16 mx-auto mb-6" width={160} height={64} />
          
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/20 mb-4">
            <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="font-display text-2xl text-primary mb-3">¡Solicitud Enviada!</h2>
          
          <div className="text-sm text-muted-foreground space-y-3 mb-6">
            <p>Recibimos tu solicitud de acceso como vendedor.</p>
            <p>Nuestro equipo la revisará en las próximas <strong>24-48 horas hábiles</strong>.</p>
            <p>Te enviaremos un email a <strong>{form.email}</strong> cuando tu acceso esté activo.</p>
          </div>
          
          <div className="bg-muted border-l-4 border-secondary p-3 text-left text-xs text-muted-foreground mb-6">
            <p className="font-semibold text-primary mb-1">📧 Importante:</p>
            <p>Revisá tu correo (incluyendo spam) para confirmar tu email primero.</p>
          </div>
          
          <Link 
            to="/" 
            className="inline-block w-full h-11 leading-[44px] bg-primary text-white font-semibold rounded-sm hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-20 bg-muted">
      <div className="w-full max-w-md bg-card border border-border rounded-sm shadow-elegant p-10">
        <div className="text-center mb-8">
          <img src={logo} alt="ALTUM GROUP" className="h-16 mx-auto" width={160} height={64} />
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-secondary font-semibold">Únete como Vendedor</p>
          <h1 className="font-display text-2xl text-primary mt-1">Solicitar acceso</h1>
          <p className="text-xs text-muted-foreground mt-2">Tu solicitud será revisada por nuestro equipo</p>
        </div>

        <button onClick={google} type="button" className="w-full h-11 mb-4 border border-border rounded-sm font-semibold text-sm hover:bg-muted">
          Continuar con Google
        </button>
        <div className="relative my-4 text-center">
          <span className="bg-card px-2 text-xs text-muted-foreground relative z-10">o con correo</span>
          <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input 
            required 
            placeholder="Nombre completo" 
            value={form.name} 
            onChange={(e) => setForm({ ...form, name: e.target.value })} 
            className="w-full h-11 px-3 border border-border rounded-sm bg-background" 
          />
          <input 
            required 
            type="email" 
            placeholder="Correo" 
            value={form.email} 
            onChange={(e) => setForm({ ...form, email: e.target.value })} 
            className="w-full h-11 px-3 border border-border rounded-sm bg-background" 
          />
          <input 
            placeholder="Teléfono (+502...)" 
            value={form.phone} 
            onChange={(e) => setForm({ ...form, phone: e.target.value })} 
            className="w-full h-11 px-3 border border-border rounded-sm bg-background" 
          />
          <input 
            required 
            type="password" 
            minLength={6} 
            placeholder="Contraseña (mín. 6)" 
            value={form.password} 
            onChange={(e) => setForm({ ...form, password: e.target.value })} 
            className="w-full h-11 px-3 border border-border rounded-sm bg-background" 
          />
          <textarea 
            placeholder="¿Por qué querés ser vendedor con ALTUM? (opcional)"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-sm bg-background text-sm resize-none"
          />
          <button 
            disabled={loading} 
            className="w-full h-11 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85 disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Solicitar acceso"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿Ya tienes cuenta? <Link to="/vendedores/login" className="text-primary hover:text-secondary font-semibold">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
