import { useEffect, useRef } from "react";

// Lazy Leaflet wrapper that mounts only in the browser.
// Allows the vendedor to drag a pin and persist lat/lng.

interface Props {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  readOnly?: boolean;
  height?: number;
}

const DEFAULT_CENTER: [number, number] = [14.6349, -90.5069]; // Guatemala City

export function MapPicker({ lat, lng, onChange, readOnly, height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;

      // Fix default icon paths
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const startLat = Number.isFinite(lat) && lat !== 0 ? lat : DEFAULT_CENTER[0];
      const startLng = Number.isFinite(lng) && lng !== 0 ? lng : DEFAULT_CENTER[1];

      const map = L.map(containerRef.current).setView([startLat, startLng], 13);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([startLat, startLng], { draggable: !readOnly }).addTo(map);
      markerRef.current = marker;

      if (!readOnly) {
        marker.on("dragend", () => {
          const { lat: la, lng: ln } = marker.getLatLng();
          onChange(Number(la.toFixed(6)), Number(ln.toFixed(6)));
        });
        map.on("click", (e: any) => {
          marker.setLatLng(e.latlng);
          onChange(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
        });
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-sm overflow-hidden border border-border" style={{ height }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
