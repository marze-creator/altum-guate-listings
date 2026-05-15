import { createFileRoute, Link, Outlet, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Mail, Phone, Eye } from "lucide-react";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">Cargando…</div>;
  if (!user) return <Navigate to="/vendedores/login" />;
  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-center px-4">
        <div>
          <h2 className="font-display text-xl text-primary">Solo administradores</h2>
          <p className="text-sm text-muted-foreground mt-2">No tienes acceso al panel administrativo.</p>
        </div>
      </div>
    );
  }
  return <Outlet />;
}

export { AdminPanel };

function AdminPanel() {
  return null;
}
