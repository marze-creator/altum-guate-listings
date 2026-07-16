import { createFileRoute, Outlet, Navigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Columns3,
  CalendarDays,
  CircleDollarSign,
  LogOut,
  BarChart3,
  FileCheck,
  Sparkles,
  User,
} from "lucide-react";


export const Route = createFileRoute("/_vendedor")({
  component: VendedorLayout,
});

function VendedorLayout() {
  const { user, loading, isVendedor, isAdmin, signOut } = useAuth();
  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">Cargando…</div>;
  }
  if (!user) return <Navigate to="/vendedores/login" />;
  if (!isVendedor) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-center px-4">
        <div>
          <h2 className="font-display text-xl text-primary">Acceso restringido</h2>
          <p className="text-sm text-muted-foreground mt-2">Esta área es solo para vendedores certificados.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={async () => {
              await signOut();
              window.location.href = "/vendedores/login";
            }}
          >
            Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <nav className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container-altum flex items-center gap-1 h-14 overflow-x-auto">
          <Link to="/vendedores/dashboard" activeProps={{ className: "text-primary bg-muted" }} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted whitespace-nowrap shrink-0">
            <LayoutDashboard size={16} /> Dashboard
          </Link>
          <Link to="/vendedores/crm" activeProps={{ className: "text-primary bg-muted" }} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted whitespace-nowrap shrink-0">
            <Columns3 size={16} /> CRM
          </Link>
          <Link to="/vendedores/agenda" activeProps={{ className: "text-primary bg-muted" }} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted whitespace-nowrap shrink-0">
            <CalendarDays size={16} /> Agenda
          </Link>
          <Link to="/vendedores/comisiones" activeProps={{ className: "text-primary bg-muted" }} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted whitespace-nowrap shrink-0">
            <CircleDollarSign size={16} /> Comisiones
          </Link>
          <Link to="/vendedores/metricas" activeProps={{ className: "text-primary bg-muted" }} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted whitespace-nowrap shrink-0">
  <BarChart3 size={16} /> Métricas
</Link>
<Link to="/vendedores/aprobacion" activeProps={{ className: "text-primary bg-muted" }} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted whitespace-nowrap shrink-0">
  <FileCheck size={16} /> Aprobación
</Link>
{isAdmin && (
  <Link to="/vendedores/contenido" activeProps={{ className: "text-primary bg-muted" }} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted whitespace-nowrap shrink-0">
    <Sparkles size={16} /> Contenido
  </Link>
)}
<Link
  to="/vendedores/cuenta"
  activeProps={{ className: "text-primary bg-muted" }}
  className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted whitespace-nowrap shrink-0"
>
  <User size={16} /> Mi Cuenta
</Link>
          <button onClick={async () => { await signOut(); window.location.href = "/vendedores/login"; }} className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary px-3 py-1.5 shrink-0">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
