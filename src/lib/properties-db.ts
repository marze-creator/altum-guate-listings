import { supabase } from "@/integrations/supabase/client";
import type { Property, PropertyType } from "@/lib/properties";
import prop1 from "@/assets/prop-1.jpg";

const TYPE_LABEL: Record<string, PropertyType> = {
  casa: "Casa",
  apartamento: "Apartamento",
  terreno: "Terreno",
  oficina: "Local",
  local: "Local",
  finca: "Casa",
};

export interface DBProperty {
  id: string;
  title: string;
  description: string | null;
  price: number;
  operation: string;
  type: string;
  zone: string;
  city: string | null;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_m2: number | null;
  features: string[] | null;
  cover_image: string | null;
  status: string;
  featured: boolean;
  views: number;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  owner_id: string;
}

export function dbToUI(p: DBProperty, images?: string[]): Property & { images: string[]; status: string; featured: boolean } {
  const imgs = images && images.length ? images : p.cover_image ? [p.cover_image] : [prop1];
  return {
    id: p.id,
    title: p.title,
    type: TYPE_LABEL[p.type] || "Casa",
    operation: (p.operation === "renta" ? "renta" : "venta"),
    zone: p.zone,
    price: Number(p.price),
    beds: p.bedrooms ?? 0,
    baths: Number(p.bathrooms ?? 0),
    area: Number(p.area_m2 ?? 0),
    image: imgs[0],
    images: imgs,
    badge: p.featured ? "Destacado" : undefined,
    description: p.description ?? "",
    amenities: p.features ?? [],
    agent: { name: "Asesor ALTUM", rating: 5 },
    lat: Number(p.latitude ?? 14.6),
    lng: Number(p.longitude ?? -90.5),
    status: p.status,
    featured: p.featured,
  };
}

export async function fetchPublishedProperties() {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DBProperty[]).map((p) => dbToUI(p));
}

export async function fetchPropertyById(id: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: imgs } = await supabase
    .from("property_images")
    .select("url")
    .eq("property_id", id)
    .order("position");
  // fire-and-forget view tracking via insert (triggers SECURITY DEFINER increment if configured; safe for anon)
  supabase.from("property_views").insert({ property_id: id }).then(() => {});
  return dbToUI(data as DBProperty, imgs?.map((i) => i.url));
}
