import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import logo from "@/assets/altum-logo.png";

const FB_URL = "https://www.facebook.com/profile.php?id=61589836941143";
const IG_URL = "https://www.instagram.com/altumgroupgt/";
const WHATSAPP_URL = "https://wa.me/50251014866";
const EMAIL = "info@altumgroup.com.gt";

export function SiteFooter() {
  return (
    <footer className="bg-primary text-primary-foreground mt-24">
      <div className="container-altum py-16 grid gap-12 md:grid-cols-4">
        <FooterBrand />
        <FooterNav />
        <FooterContact />
        <FooterSocial />
      </div>
      <FooterBottom />
    </footer>
  );
}

function FooterBrand() {
  return (
    <div>
      <img
        src={logo}
        alt="ALTUM GROUP"
        className="h-16 w-auto bg-white/95 rounded-sm p-2"
        width={140}
        height={56}
      />
      <p className="mt-4 text-sm text-primary-foreground/75 leading-relaxed">
        Inmobiliaria, Inversion y Desarrollo. Bienes raices de lujo en Guatemala.
      </p>
    </div>
  );
}

function FooterNav() {
  return (
    <div>
      <h4 className="font-display font-semibold text-secondary mb-4 text-sm uppercase tracking-wider">
        Navegacion
      </h4>
      <ul className="space-y-2 text-sm text-primary-foreground/80">
        <li>
          <Link to="/propiedades" className="hover:text-secondary">Propiedades</Link>
        </li>
        <li>
          <Link to="/compra" className="hover:text-secondary">Compra</Link>
        </li>
        <li>
          <Link to="/renta" className="hover:text-secondary">Renta</Link>
        </li>
        <li>
          <Link to="/publica" className="hover:text-secondary">Publica tu propiedad</Link>
        </li>
        <li>
          <Link to="/acerca" className="hover:text-secondary">Acerca de nosotros</Link>
        </li>
      </ul>
    </div>
  );
}

function FooterContact() {
  return (
    <div>
      <h4 className="font-display font-semibold text-secondary mb-4 text-sm uppercase tracking-wider">
        Contacto
      </h4>
      <ul className="space-y-3 text-sm text-primary-foreground/80">
        <li className="flex items-start gap-2">
          <MapPin size={16} className="mt-0.5 text-secondary" />
          <span>Ciudad de Guatemala, Guatemala</span>
        </li>
        <li className="flex items-center gap-2">
          <Phone size={16} className="text-secondary" />
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="hover:text-secondary">
            +502 5101-4866
          </a>
        </li>
        <li className="flex items-center gap-2">
          <Mail size={16} className="text-secondary" />
          <a href={"mailto:" + EMAIL} className="hover:text-secondary">
            {EMAIL}
          </a>
        </li>
      </ul>
    </div>
  );
}

function FooterSocial() {
  return (
    <div>
      <h4 className="font-display font-semibold text-secondary mb-4 text-sm uppercase tracking-wider">
        Siguenos
      </h4>
      <div className="flex gap-3 mb-6">
        <a
          href={FB_URL}
          target="_blank"
          rel="noreferrer"
          className="p-2 rounded-sm border border-secondary/30 hover:bg-secondary hover:text-primary transition-colors"
          aria-label="Facebook"
        >
          <Facebook size={16} />
        </a>
        <a
          href={IG_URL}
          target="_blank"
          rel="noreferrer"
          className="p-2 rounded-sm border border-secondary/30 hover:bg-secondary hover:text-primary transition-colors"
          aria-label="Instagram"
        >
          <Instagram size={16} />
        </a>
      </div>
      <p className="text-xs text-primary-foreground/70 mb-2 uppercase tracking-wider">
        Newsletter
      </p>
      <form className="flex gap-2">
        <input
          type="email"
          placeholder="Tu correo"
          className="flex-1 px-3 py-2 text-sm rounded-sm bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:border-secondary"
        />
        <button className="px-3 py-2 text-xs font-semibold uppercase rounded-sm bg-secondary text-primary hover:bg-secondary/85">
          Recibir
        </button>
      </form>
    </div>
  );
}

function FooterBottom() {
  return (
    <div className="border-t border-primary-foreground/10">
      <div className="container-altum py-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-primary-foreground/60">
        <p>
          (c) {new Date().getFullYear()} ALTUM GROUP. Todos los derechos reservados.
        </p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-secondary">Terminos</a>
          <a href="#" className="hover:text-secondary">Privacidad</a>
        </div>
      </div>
    </div>
  );
}
