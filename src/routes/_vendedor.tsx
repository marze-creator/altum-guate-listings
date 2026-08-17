import { createFileRoute, Outlet, Navigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Columns3,
  MessageSquareText,
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

const vendorNavItemClass =
  "inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-sm text-gold/85 hover:text-gold hover:bg-white/10 whitespace-nowrap shrink-0 transition-colors";
const vendorNavActiveClass = "text-gold bg-white/10 ring-1 ring-gold/25";

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
      <nav className="sticky top-0 z-50 bg-primary border-b border-gold/30 shadow-sm">
        <div className="container-altum flex items-center gap-1 h-14 overflow-x-auto">
          <Link to="/vendedores/dashboard" activeProps={{ className: vendorNavActiveClass }} className={vendorNavItemClass}>
            <LayoutDashboard size={16} /> Dashboard
          </Link>
          <Link to="/vendedores/crm" activeProps={{ className: vendorNavActiveClass }} className={vendorNavItemClass}>
            <Columns3 size={16} /> CRM
          </Link>
          <Link to="/vendedores/conversaciones" activeProps={{ className: vendorNavActiveClass }} className={vendorNavItemClass}>
            <MessageSquareText size={16} /> Conversaciones
          </Link>
          <Link to="/vendedores/agenda" activeProps={{ className: vendorNavActiveClass }} className={vendorNavItemClass}>
            <CalendarDays size={16} /> Agenda
          </Link>
          <Link to="/vendedores/comisiones" activeProps={{ className: vendorNavActiveClass }} className={vendorNavItemClass}>
            <CircleDollarSign size={16} /> Comisiones
          </Link>
          <Link to="/vendedores/metricas" activeProps={{ className: vendorNavActiveClass }} className={vendorNavItemClass}>
            <BarChart3 size={16} /> Métricas
          </Link>
          <Link to="/vendedores/aprobacion" activeProps={{ className: vendorNavActiveClass }} className={vendorNavItemClass}>
            <FileCheck size={16} /> Aprobación
          </Link>
          {isAdmin && (
            <Link to="/vendedores/contenido" activeProps={{ className: vendorNavActiveClass }} className={vendorNavItemClass}>
              <Sparkles size={16} /> Contenido
            </Link>
          )}
          <Link to="/vendedores/cuenta" activeProps={{ className: vendorNavActiveClass }} className={vendorNavItemClass}>
            <User size={16} /> Mi Cuenta
          </Link>
          <button
            onClick={async () => {
              await signOut();
              window.location.href = "/vendedores/login";
            }}
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-gold/80 hover:text-gold hover:bg-white/10 px-3 py-1.5 rounded-sm shrink-0 transition-colors"
          >
            <LogOut size={16} /> Salir
          </button>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
