import { useEffect, useState } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";

export function FloatingActions() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <a
        href="https://wa.me/50251014866?text=Hola%20ALTUM%20GROUP"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-elegant text-white transition-transform hover:scale-105"
        style={{ backgroundColor: "var(--whatsapp)" }}
        aria-label="WhatsApp"
      >
        <MessageCircle size={26} strokeWidth={2.2} />
      </a>
      {show && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-secondary text-primary shadow-card hover:bg-secondary/85 transition-colors"
          aria-label="Volver al inicio"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </>
  );
}
