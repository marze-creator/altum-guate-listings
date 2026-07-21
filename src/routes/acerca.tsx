import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/altum-logo.png";

export const Route = createFileRoute("/acerca")({
  head: () => ({
    meta: [
      { title: "Acerca de Nosotros — ALTUM GROUP" },
      {
        name: "description",
        content:
          "ALTUM GROUP: inmobiliaria, inversión y desarrollo en Guatemala. División inmobiliaria de RAME Importaciones.",
      },
      { property: "og:url", content: "/acerca" },
    ],
    links: [{ rel: "canonical", href: "/acerca" }],
  }),
  component: AcercaPage,
});

const VALUES = [
  {
    t: "Misión",
    d: "Conectar personas con propiedades extraordinarias mediante asesoría profesional, ética y personalizada.",
  },
  {
    t: "Visión",
    d: "Ser la inmobiliaria de referencia en Guatemala para bienes raíces, inversión y desarrollo.",
  },
  {
    t: "Valores",
    d: "Excelencia, integridad, transparencia y compromiso absoluto con nuestros clientes.",
  },
];

const STATS = [
  { n: "40", l: "Propiedades vendidas" },
  { n: "65", l: "Clientes satisfechos" },
  { n: "3", l: "Años de experiencia inmobiliaria" },
  { n: "93%", l: "Satisfacción" },
];

function AcercaPage() {
  return (
    <>
      {/* Encabezado */}
      <section className="bg-primary py-24 text-primary-foreground">
        <div className="container-altum mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
            Sobre nosotros
          </p>

          <h1 className="font-display text-4xl md:text-6xl">
            ALTUM GROUP
          </h1>

          <p className="mt-3 text-lg uppercase tracking-[0.2em] text-secondary">
            Inmobiliaria · Inversión · Desarrollo
          </p>
        </div>
      </section>

      {/* Historia e información legal */}
      <section className="py-20">
        <div className="container-altum grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
              Nuestra historia
            </p>

            <h2 className="mb-6 font-display text-4xl text-primary">
              Una trayectoria construida sobre confianza
            </h2>

            <p className="leading-relaxed text-primary/80">
              ALTUM GROUP guía a familias, propietarios e inversionistas en
              procesos de compra, venta, renta e inversión inmobiliaria en
              Guatemala. Nuestro nombre — ALTUM, “lo elevado” — representa el
              estándar profesional que buscamos aplicar en cada transacción.
            </p>

            <p className="mt-4 leading-relaxed text-primary/80">
              Combinamos conocimiento del mercado local, atención personalizada
              y herramientas digitales para ofrecer un servicio inmobiliario
              transparente, eficiente y confiable.
            </p>

            <div className="mt-8 rounded-r-sm border-l-4 border-secondary bg-secondary/10 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                Información legal
              </p>

              <p className="mt-2 text-sm leading-relaxed text-primary/80">
                ALTUM Group opera como la división inmobiliaria de RAME
                Importaciones, empresa propiedad y bajo la administración de
                Benett Marcelo Rojas Peña, en Guatemala.
              </p>
            </div>
          </div>

          {/* Logo y ubicación */}
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-sm border border-border bg-muted p-8">
            <div className="text-center">
              <img
                src={logo}
                alt="Logo de ALTUM GROUP"
                loading="lazy"
                className="mx-auto h-auto w-44 md:w-52"
              />

              <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                Ubicación
              </p>

              <p className="mt-2 font-display text-xl text-primary">
                Ciudad de Guatemala
              </p>

              <p className="mt-1 text-sm text-primary/70">
                Guatemala, Centroamérica
              </p>

              <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-primary/70">
                Servicios inmobiliarios de compra, venta, renta, inversión y
                desarrollo de propiedades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Misión, visión y valores */}
      <section className="bg-muted py-20">
        <div className="container-altum grid gap-6 md:grid-cols-3">
          {VALUES.map((value) => (
            <div
              key={value.t}
              className="rounded-sm border-l-4 border-secondary bg-card p-8"
            >
              <h3 className="font-display text-2xl text-primary">
                {value.t}
              </h3>

              <p className="mt-3 leading-relaxed text-muted-foreground">
                {value.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Estadísticas */}
      <section className="py-20">
        <div className="container-altum grid grid-cols-2 gap-6 md:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.l}
              className="rounded-sm bg-secondary/20 p-6 text-center md:p-8"
            >
              <p className="font-display text-4xl font-bold text-primary md:text-5xl">
                {stat.n}
              </p>

              <p className="mt-2 text-xs uppercase tracking-wider text-primary/70 md:text-sm">
                {stat.l}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Llamada a la acción */}
      <section className="bg-primary py-20 text-center text-primary-foreground">
        <div className="container-altum">
          <h2 className="font-display text-3xl md:text-4xl">
            Únete al Equipo ALTUM GROUP
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Buscamos asesores con pasión por los bienes raíces y compromiso con
            un servicio profesional.
          </p>

          <Link
            to="/vendedores/login"
            className="mt-8 inline-flex rounded-sm bg-secondary px-8 py-3.5 font-semibold text-primary hover:bg-secondary/85"
          >
            Conoce más
          </Link>
        </div>
      </section>
    </>
  );
}
