import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/acerca")({
  head: () => ({
    meta: [
      { title: "Acerca de Nosotros — ALTUM GROUP" },
      { name: "description", content: "ALTUM GROUP: inmobiliaria, inversión y desarrollo en Guatemala. Conoce nuestra historia, equipo y valores." },
      { property: "og:url", content: "/acerca" },
    ],
    links: [{ rel: "canonical", href: "/acerca" }],
  }),
  component: AcercaPage,
});

const VALUES = [
  { t: "Misión", d: "Conectar personas con propiedades extraordinarias mediante asesoría profesional, ética y personalizada." },
  { t: "Visión", d: "Ser la inmobiliaria de referencia en Guatemala para bienes raíces de lujo, inversión y desarrollo." },
  { t: "Valores", d: "Excelencia, integridad, transparencia y compromiso absoluto con nuestros clientes." },
];

const STATS = [
  { n: "+850", l: "Propiedades vendidas" },
  { n: "+1,200", l: "Clientes satisfechos" },
  { n: "12", l: "Años de experiencia" },
  { n: "98%", l: "Satisfacción" },
];


function AcercaPage() {
  return (
    <>
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container-altum text-center max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-[0.25em] text-secondary font-semibold mb-3">Sobre nosotros</p>
          <h1 className="font-display text-4xl md:text-6xl">ALTUM GROUP</h1>
          <p className="mt-3 text-secondary text-lg uppercase tracking-[0.2em]">Inmobiliaria · Inversión · Desarrollo</p>
        </div>
      </section>

      <section className="py-20">
        <div className="container-altum grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-secondary font-semibold mb-3">Nuestra historia</p>
            <h2 className="font-display text-4xl text-primary mb-6">Una trayectoria construida sobre confianza</h2>
            <p className="text-primary/80 leading-relaxed">
              Desde 2023 ALTUM GROUP ha guiado a familias e inversionistas en la compra, venta, renta y desarrollo de propiedades premium en Guatemala. Nuestro nombre — ALTUM, "lo elevado" — refleja el estándar que aplicamos a cada transacción.
            </p>
            <p className="mt-4 text-primary/80 leading-relaxed">
              Combinamos conocimiento profundo del mercado local con un servicio de boutique internacional.
            </p>
            <div className="mt-8 border-l-4 border-secondary bg-secondary/10 px-5 py-4 rounded-r-sm">
  <p className="text-xs uppercase tracking-[0.2em] text-secondary font-semibold">
    Información legal
  </p>

  <p className="mt-2 text-sm text-primary/80 leading-relaxed">
    ALTUM Group es la división inmobiliaria de RAME Importaciones,
    propiedad y administrada por Benett Marcelo Rojas Peña, en Guatemala.
  </p>
</div>
          </div>
          <div className="aspect-[4/3] bg-muted rounded-sm overflow-hidden">
            <img src="/src/assets/prop-2.jpg" alt="Oficinas ALTUM" loading="lazy" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted">
        <div className="container-altum grid md:grid-cols-3 gap-6">
          {VALUES.map((v) => (
            <div key={v.t} className="p-8 bg-card border-l-4 border-secondary rounded-sm">
              <h3 className="font-display text-2xl text-primary">{v.t}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20">
        <div className="container-altum grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.l} className="text-center p-8 bg-secondary/20 rounded-sm">
              <p className="font-display text-4xl md:text-5xl text-primary font-bold">{s.n}</p>
              <p className="mt-2 text-sm text-primary/70 uppercase tracking-wider">{s.l}</p>
            </div>
          ))}
        </div>
      </section>


      <section className="py-20 bg-primary text-primary-foreground text-center">
        <div className="container-altum">
          <h2 className="font-display text-3xl md:text-4xl">Únete al Equipo ALTUM GROUP</h2>
          <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">Buscamos asesores con pasión por los bienes raíces de excelencia.</p>
          <Link to="/vendedores/login" className="mt-8 inline-flex px-8 py-3.5 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85">
            Conoce más
          </Link>
        </div>
      </section>
    </>
  );
}
