import { createFileRoute } from "@tanstack/react-router";
import { ConversationsInbox } from "@/components/conversations-inbox";

export const Route = createFileRoute("/_vendedor/vendedores/conversaciones")({
  head: () => ({
    meta: [
      { title: "Conversaciones — ALTUM GROUP" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConversationsPage,
});

function ConversationsPage() {
  return (
    <div className="conversations-route-shell">
      <ConversationsInbox />
    </div>
  );
}
