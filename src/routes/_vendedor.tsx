import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_vendedor")({
  component: VendedorLayout,
});

function VendedorLayout() {
  const { user, loading, isVendedor, signOut } = useAuth();
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
  return <Outlet />;
}
