import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { User, ShieldCheck, KeyRound, LogOut } from "lucide-react";

export const Route = createFileRoute("/_vendedor/vendedores/cuenta")({
  head: () => ({
    meta: [{ title: "Mi Cuenta — ALTUM GROUP" }, { name: "robots", content: "noindex" }],
  }),
  component: MiCuenta,
});

function MiCuenta() {
  const { user, roles, signOut } = useAuth();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  async function cambiarPassword() {
    if (pw1.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (pw1 !== pw2) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPw1("");
    setPw2("");
    toast.success("Contraseña actualizada correctamente.");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#C9A84C]">Portal Vendedor</p>
        <h1 className="text-3xl font-bold text-[#1A2845]">Mi Cuenta</h1>
        <p className="mt-1 text-sm text-gray-500">Tu información y seguridad.</p>
      </div>

      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-[#C9A84C]" />
          <h2 className="font-semibold text-[#1A2845]">Información</h2>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-gray-500">Correo</span>
            <span className="font-medium text-[#1A2845]">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-gray-500">Rol(es)</span>
            <span className="font-medium text-[#1A2845]">{roles && roles.length ? roles.join(", ") : "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Correo confirmado</span>
            <span className="flex items-center gap-1 font-medium text-green-600">
              <ShieldCheck className="h-4 w-4" />
              {user?.email_confirmed_at ? "Sí" : "No"}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-[#C9A84C]" />
          <h2 className="font-semibold text-[#1A2845]">Cambiar contraseña</h2>
        </div>
        <div className="space-y-3">
          <input
            type="password"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            placeholder="Nueva contraseña (mínimo 8 caracteres)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C9A84C] focus:outline-none"
          />
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Confirmar nueva contraseña"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C9A84C] focus:outline-none"
          />
          <button
            onClick={cambiarPassword}
            disabled={saving}
            className="rounded-lg bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Actualizar contraseña"}
          </button>
        </div>
      </div>

      <button
        onClick={() => signOut()}
        className="flex items-center gap-2 text-sm font-medium text-red-600 hover:underline"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    </div>
  );
}
