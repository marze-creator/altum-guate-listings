 import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import logo from "@/assets/altum-logo.png";
export function SiteFooter() {
  return (
    <footer className="bg-primary text-primary-foreground mt-24">
      <div className="container-altum py-16 grid gap-12 md:grid-cols-4">
        <div>
          <img src={logo} alt="ALTUM GROUP" className="h-16 w-auto bg-white/95 rounded
          <p className="mt-4 text-sm text-primary-foreground/75 leading-relaxed">
            Inmobiliaria · Inversión · Desarrollo. Bienes raíces de lujo en Guatemala.
          </p>
</div>
        <div>
          <h4 className="font-display font-semibold text-secondary mb-4 text-sm upperc
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li><Link to="/propiedades" className="hover:text-secondary">Propiedades</
            <li><Link to="/compra" className="hover:text-secondary">Compra</Link></li>
            <li><Link to="/renta" className="hover:text-secondary">Renta</Link></li>
            <li><Link to="/publica" className="hover:text-secondary">Publica tu propie
            <li><Link to="/acerca" className="hover:text-secondary">Acerca de nosotros
</ul> </div>
        <div>
          <h4 className="font-display font-semibold text-secondary mb-4 text-sm upperc
          <ul className="space-y-3 text-sm text-primary-foreground/80">
            <li className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 text-secondary" />
              <span>Ciudad de Guatemala, Guatemala</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} className="text-secondary" />
              <a href="https://wa.me/50251014866" target="_blank" rel="noreferrer" cla
                +502 5101-4866
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={16} className="text-secondary" />
              <a href="mailto:info@altumgroup.com.gt" className="hover:text-secondary"
                info@altumgroup.com.gt
              </a>
-sm p-2
ase tra
Link></
dad</Li
</Link>
ase tra
ssName=
>
 </li> </ul>
</div>
  <div>
    <h4 className="font-display font-semibold text-secondary mb-4 text-sm upperc
    <div className="flex gap-3 mb-6">
      <a
        href="https://www.facebook.com/profile.php?id=61589836941143"
        target="_blank"
        rel="noreferrer"
        className="p-2 rounded-sm border border-secondary/30 hover:bg-secondary
        aria-label="Facebook"
      >
        <Facebook size={16} />
</a> <a
        href="https://www.instagram.com/altumgroupgt/"
        target="_blank"
        rel="noreferrer"
        className="p-2 rounded-sm border border-secondary/30 hover:bg-secondary
        aria-label="Instagram"
      >
        <Instagram size={16} />
</a> </div>
    <p className="text-xs text-primary-foreground/70 mb-2 uppercase tracking-wid
    <form className="flex gap-2">
      <input
        type="email"
        placeholder="Tu correo"
        className="flex-1 px-3 py-2 text-sm rounded-sm bg-primary-foreground/10
      />
      <button className="px-3 py-2 text-xs font-semibold uppercase rounded-sm bg
        Recibir
      </button>
    </form>
  </div>
</div>
<div className="border-t border-primary-foreground/10">
  <div className="container-altum py-6 flex flex-col sm:flex-row justify-between
    <p>© {new Date().getFullYear()} ALTUM GROUP. Todos los derechos reservados.<
    <div className="flex gap-4">
      <a href="#" className="hover:text-secondary">Términos</a>
      <a href="#" className="hover:text-secondary">Privacidad</a>
    </div>
ase tra
hover:t
hover:t
er">New
border
-second
items- /p>

 
</div>
      </div>
</footer> );
}
