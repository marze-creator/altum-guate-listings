import prop1 from "@/assets/prop-1.jpg";
import prop2 from "@/assets/prop-2.jpg";
import prop3 from "@/assets/prop-3.jpg";
import prop4 from "@/assets/prop-4.jpg";
import prop5 from "@/assets/prop-5.jpg";
import prop6 from "@/assets/prop-6.jpg";

export type PropertyType = "Casa" | "Apartamento" | "Terreno" | "Local";
export type Operation = "venta" | "renta";

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  operation: Operation;
  zone: string;
  price: number; // GTQ
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

export const ZONES = [
  "Zona 10",
  "Zona 9",
  "Zona 14",
  "Zona 15",
  "Zona 16",
  "Cayalá",
  "Antigua Guatemala",
  "Lago Atitlán",
  "Escuintla",
  "Palencia",
];

export const PROPERTY_TYPES: PropertyType[] = ["Casa", "Apartamento", "Terreno", "Local"];

export const PROPERTIES: Property[] = [
  {
    id: "altum-001",
    title: "Penthouse de Lujo Vista Panorámica",
    type: "Apartamento",
    operation: "venta",
    zone: "Zona 10",
    price: 4500000,
    beds: 3,
    baths: 3,
    area: 320,
    image: prop4,
    badge: "ALTUM PREMIUM",
    description:
      "Espectacular penthouse con vistas 360° de la ciudad. Acabados de lujo, ventanales de piso a techo y diseño minimalista contemporáneo.",
    amenities: ["Piscina", "Gimnasio", "Seguridad 24/7", "Parqueo doble", "Terraza privada"],
    agent: { name: "Andrea Morales", rating: 5 },
    lat: 14.5985,
    lng: -90.5132,
  },
  {
    id: "altum-002",
    title: "Edificio Residencial Boutique",
    type: "Apartamento",
    operation: "venta",
    zone: "Zona 14",
    price: 2750000,
    beds: 2,
    baths: 2,
    area: 180,
    image: prop1,
    badge: "Destacado",
    description:
      "Apartamento moderno en exclusivo edificio boutique. Amplios espacios y excelente ubicación.",
    amenities: ["Lobby", "Gimnasio", "Coworking", "Parqueo"],
    agent: { name: "Diego Castillo", rating: 5 },
    lat: 14.5847,
    lng: -90.504,
  },
  {
    id: "altum-003",
    title: "Casa Colonial en Antigua",
    type: "Casa",
    operation: "venta",
    zone: "Antigua Guatemala",
    price: 3850000,
    beds: 4,
    baths: 4,
    area: 420,
    image: prop2,
    badge: "ALTUM PREMIUM",
    description:
      "Hermosa casa colonial completamente restaurada con jardines amplios, patios interiores y arquitectura tradicional.",
    amenities: ["Jardín", "Patio interior", "Chimenea", "Casa de huéspedes"],
    agent: { name: "Sofía Herrera", rating: 5 },
    lat: 14.5586,
    lng: -90.7339,
  },
  {
    id: "altum-004",
    title: "Villa Frente al Lago Atitlán",
    type: "Casa",
    operation: "venta",
    zone: "Lago Atitlán",
    price: 5200000,
    beds: 5,
    baths: 5,
    area: 550,
    image: prop3,
    badge: "ALTUM PREMIUM",
    description:
      "Exclusiva villa con piscina infinita y vistas al volcán. Una experiencia única de vida frente al lago más bello del mundo.",
    amenities: ["Piscina infinita", "Muelle privado", "Vista al volcán", "Spa"],
    agent: { name: "Roberto Aldana", rating: 5 },
    lat: 14.6914,
    lng: -91.2024,
  },
  {
    id: "altum-005",
    title: "Residencia Moderna en Cayalá",
    type: "Casa",
    operation: "venta",
    zone: "Cayalá",
    price: 3200000,
    beds: 4,
    baths: 4,
    area: 380,
    image: prop5,
    badge: "Nuevo",
    description:
      "Residencia contemporánea en exclusivo desarrollo. Diseño limpio, jardines paisajísticos y comunidad privada.",
    amenities: ["Jardín", "Garage doble", "Smart home", "Seguridad"],
    agent: { name: "Andrea Morales", rating: 5 },
    lat: 14.6105,
    lng: -90.4783,
  },
  {
    id: "altum-006",
    title: "Terreno con Vista a Volcanes",
    type: "Terreno",
    operation: "venta",
    zone: "Palencia",
    price: 850000,
    beds: 0,
    baths: 0,
    area: 2400,
    image: prop6,
    badge: "Destacado",
    description:
      "Terreno premium con vistas privilegiadas. Ideal para proyecto residencial exclusivo o casa de campo.",
    amenities: ["Vista panorámica", "Acceso pavimentado", "Servicios"],
    agent: { name: "Diego Castillo", rating: 4 },
    lat: 14.6633,
    lng: -90.3617,
  },
  {
    id: "altum-007",
    title: "Apartamento Renta Zona 10",
    type: "Apartamento",
    operation: "renta",
    zone: "Zona 10",
    price: 18000,
    beds: 2,
    baths: 2,
    area: 140,
    image: prop1,
    badge: "Nuevo",
    description: "Renta mensual. Apartamento amueblado en zona viva.",
    amenities: ["Amueblado", "Gimnasio", "Seguridad"],
    agent: { name: "Sofía Herrera", rating: 5 },
    lat: 14.5965,
    lng: -90.5142,
  },
  {
    id: "altum-008",
    title: "Casa Renta Antigua",
    type: "Casa",
    operation: "renta",
    zone: "Antigua Guatemala",
    price: 22000,
    beds: 3,
    baths: 3,
    area: 280,
    image: prop2,
    description: "Casa colonial para renta mensual con jardín privado.",
    amenities: ["Amueblada", "Jardín", "Internet"],
    agent: { name: "Roberto Aldana", rating: 5 },
    lat: 14.557,
    lng: -90.732,
  },
  {
    id: "altum-009",
    title: "Local Comercial Premium",
    type: "Local",
    operation: "renta",
    zone: "Zona 9",
    price: 35000,
    beds: 0,
    baths: 2,
    area: 220,
    image: prop1,
    badge: "Destacado",
    description: "Local sobre avenida principal, alto tráfico vehicular.",
    amenities: ["Estacionamiento", "Vitrinas", "Aire acondicionado"],
    agent: { name: "Diego Castillo", rating: 4 },
    lat: 14.6,
    lng: -90.518,
  },
  {
    id: "altum-010",
    title: "Apartamento Zona 15 Vista al Valle",
    type: "Apartamento",
    operation: "venta",
    zone: "Zona 15",
    price: 1950000,
    beds: 3,
    baths: 2,
    area: 165,
    image: prop4,
    description: "Hermoso apartamento con balcón amplio y vista al valle.",
    amenities: ["Piscina", "BBQ", "Salón social"],
    agent: { name: "Andrea Morales", rating: 5 },
    lat: 14.6075,
    lng: -90.49,
  },
  {
    id: "altum-011",
    title: "Casa Familiar Zona 16",
    type: "Casa",
    operation: "venta",
    zone: "Zona 16",
    price: 2480000,
    beds: 4,
    baths: 3,
    area: 310,
    image: prop5,
    description: "Residencia familiar en condominio exclusivo.",
    amenities: ["Jardín", "Cancha", "Salón social", "Áreas verdes"],
    agent: { name: "Sofía Herrera", rating: 5 },
    lat: 14.617,
    lng: -90.481,
  },
  {
    id: "altum-012",
    title: "Terreno Escuintla Costa",
    type: "Terreno",
    operation: "venta",
    zone: "Escuintla",
    price: 450000,
    beds: 0,
    baths: 0,
    area: 5000,
    image: prop6,
    description: "Amplio terreno con potencial agrícola o desarrollo turístico.",
    amenities: ["Acceso", "Servicios cercanos"],
    agent: { name: "Roberto Aldana", rating: 4 },
    lat: 14.305,
    lng: -90.785,
  },
];

export const formatGTQ = (n: number) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    maximumFractionDigits: 0,
  }).format(n);
