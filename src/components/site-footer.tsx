import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import logo from "@/assets/altum-logo.png";

export function SiteFooter() {
  return (
    <footer className="bg-primary text-primary-foreground mt-24">
      <div className="container-altum py-16 grid gap-12 md:grid-cols-4">
        <div>
          <img src={logo} alt="ALTUM GROUP" className="h-16 w-auto bg-white/95 rounded-sm p-2" width={140} height={56} />
          <p className="mt-4 text-sm text-primary-foreground/75 leading-relaxed">
            Inmobiliaria · Inversión · Desarrollo. Bienes raíces de lujo en Guatemala.
          </p>
        </div>

        <div>
          <h4 className="font-display font-semibold text-secondary mb-4 text-sm uppercase tracking-wider">Navegación</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li><Link to="/propiedades" className="hover:text-secondary">Propiedades</Link></li>
            <li><Link to="/compra" className="hover:text-secondary">Compra</Link></li>
            <li><Link to="/renta" className="hover:text-secondary">Renta</Link></li>
            <li><Link to="/publica" className="hover:text-secondary">Publica tu propiedad</Link></li>
            <li><Link to="/acerca" className="hover:text-secondary">Acerca de nosotros</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display font-semibold text-secondary mb-4 text-sm uppercase tracking-wider">Contacto</h4>
          <ul className="space-y-3 text-sm text-primary-foreground/80">
            <li className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 text-secondary" /><span>Zona 10, Ciudad de Guatemala</span></li>
            <li className="flex items-center gap-2"><Phone size={16} className="text-secondary" /><span suppressHydrationWarning>+502 2200-0000</span></li>
            <li className="flex items-center gap-2"><Mail size={16} className="text-secondary" /><span suppressHydrationWarning>contacto@altumgroup.gt</span></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display font-semibold text-secondary mb-4 text-sm uppercase tracking-wider">Síguenos</h4>
          <div className="flex gap-3 mb-6">
            {[Facebook, Instagram, Linkedin].map((Icon, i) => (
              <a key={i} href="#" className="p-2 rounded-sm border border-secondary/30 hover:bg-secondary hover:text-primary transition-colors" aria-label="Red social">
                <Icon size={16} />
              </a>
            ))}
            <a href="#" className="p-2 rounded-sm border border-secondary/30 hover:bg-secondary hover:text-primary transition-colors text-xs font-bold flex items-center" aria-label="TikTok">
              TT
            </a>
          </div>
          <p className="text-xs text-primary-foreground/70 mb-2 uppercase tracking-wider">Newsletter</p>
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
      </div>

      <div className="border-t border-primary-foreground/10">
        <div className="container-altum py-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-primary-foreground/60">
          <p>© {new Date().getFullYear()} ALTUM GROUP. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-secondary">Términos</a>
            <a href="#" className="hover:text-secondary">Privacidad</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
