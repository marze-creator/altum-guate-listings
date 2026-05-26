import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import logo from "@/assets/altum-logo.png";

export const Route = createFileRoute("/vendedores/signup")({
  head: () => ({
    meta: [
      { title: "Registro Vendedores — ALTUM GROUP" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useSta…
