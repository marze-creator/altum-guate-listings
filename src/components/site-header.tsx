import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, LayoutDashboard, LogOut, Shield } from "lucide-react";
import logo from "@/assets/altum-logo.png";
import { useAuth } from "@/hooks/use-auth";

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/propiedades", label: "Propiedades" },
  { to: "/compra", label: "Compra" },
  { to: "/renta", label: "Renta" },
  { to: "/publica", label: "Publica tu Propiedad" },
  { to: "/acerca", label: "Acerca de Nosotros" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, isVendedor, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="container-altum flex items-center justify-between h-20">
        <Link to="/" className="flex items-center gap-2" aria-label="ALTUM GROUP">
          <img src={logo} alt="ALTUM GROUP" className="h-12 w-auto" width={160} height={48} />
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {NAV.map((n) => {
            const active = path === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`text-sm font-medium tracking-wide transition-colors ${
                  active ? "text-primary" : "text-primary/75 hover:text-primary"
                }`}
              >
                {n.label}
                {active && (
                  <span className="block h-px mt-1 bg-secondary" aria-hidden />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {user && isVendedor ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-sm border border-secondary text-primary hover:bg-secondary/15 transition-colors">
                  <Shield size={14} /> Admin
                </Link>
              )}
              <Link to="/vendedores/dashboard" className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-sm bg-secondary text-primary hover:bg-secondary/80 transition-colors">
                <LayoutDashboard size={14} /> Dashboard
              </Link>
              <button onClick={signOut} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm text-primary/75 hover:text-primary" aria-label="Cerrar sesión">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link to="/vendedores/login" className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold rounded-sm bg-secondary text-primary hover:bg-secondary/80 transition-colors">
              Acceso Vendedores
            </Link>
          )}
          <button
            className="lg:hidden p-2 text-primary"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <nav className="container-altum py-4 flex flex-col gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="px-2 py-3 text-primary font-medium hover:bg-muted rounded-sm"
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/vendedores/login"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex justify-center px-4 py-3 text-sm font-semibold rounded-sm bg-secondary text-primary"
            >
              Acceso Vendedores
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
