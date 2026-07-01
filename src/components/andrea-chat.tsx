import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";

const WEBHOOK_URL = "https://altumgroup.app.n8n.cloud/webhook/altum-web-chat";
const SESSION_KEY = "altum_chat_session_id";

type Msg = { role: "user" | "assistant"; text: string };

function getSessionId() {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = "web_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function AndreaChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "¡Hola! Soy Andrea de ALTUM GROUP. ¿En qué puedo ayudarte hoy?" },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending, open]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setSending(true);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: getSessionId(),
          message: text,
          name: name || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = (data && (data.reply ?? data.message)) || "Gracias, en breve te contactamos.";
      setMessages((m) => [...m, { role: "assistant", text: String(reply) }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Ocurrió un problema. Intenta de nuevo en unos segundos." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir chat con Andrea"
          className="fixed bottom-24 right-5 z-50 flex items-center gap-2 rounded-full bg-[#1A2845] px-4 py-3 text-[#C9B89A] shadow-2xl ring-1 ring-[#C9B89A]/40 transition hover:scale-105 hover:bg-[#243459]"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-semibold">Chat con Andrea</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[520px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl bg-[#1A2845] text-white shadow-2xl ring-1 ring-[#C9B89A]/40">
          <div className="flex items-center justify-between border-b border-[#C9B89A]/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C9B89A] font-bold text-[#1A2845]">
                A
              </div>
              <div>
                <div className="text-sm font-semibold text-[#C9B89A]">Andrea · ALTUM GROUP</div>
                <div className="text-[11px] text-white/60">En línea</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
              className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#C9B89A] text-[#1A2845]"
                      : "bg-white/10 text-white"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm text-white/80">
                  <span className="inline-flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#C9B89A]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#C9B89A] [animation-delay:120ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#C9B89A] [animation-delay:240ms]" />
                  </span>
                  <span className="ml-2 text-xs text-white/60">Andrea está escribiendo…</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[#C9B89A]/20 px-3 py-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre (opcional)"
              className="mb-2 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white placeholder:text-white/40 focus:border-[#C9B89A] focus:outline-none"
            />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe un mensaje…"
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#C9B89A] focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Enviar"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C9B89A] text-[#1A2845] transition hover:bg-[#d6c7ab] disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
