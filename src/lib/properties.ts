import { UBICACIONES_PREDEFINIDAS } from "@/lib/locations";

export type PropertyType = "Casa" | "Apartamento" | "Terreno" | "Local" | "Oficina" | "Bodega";
export type Operation = "venta" | "renta";

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  operation: Operation;
  zone: string;
  price: number;
  currency?: "GTQ" | "USD";
  beds: number;
  baths: number;
  area: number; // m2
  image: string;
  badge?: "Nuevo" | "Destacado" | "ALTUM PREMIUM";
  description: string;
  amenities: string[];
  agent: { name: string; rating: number };
  lat: number;
  lng: number;
}

export const ZONES = UBICACIONES_PREDEFINIDAS;

export const PROPERTY_TYPES: PropertyType[] = ["Casa", "Apartamento", "Terreno", "Local", "Oficina", "Bodega"];

export const formatGTQ = (n: number) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    maximumFractionDigits: 0,
  }).format(n);

export const formatMoney = (n: number, currency: "GTQ" | "USD" = "GTQ") =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
