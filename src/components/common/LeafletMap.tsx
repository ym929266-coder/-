import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LeafletMapProps {
  center: [number, number]; // [lat, lng]
  zoom?: number;
  restaurantLocation?: { lat: number; lng: number; name: string };
  customerLocation?: { lat: number; lng: number; address: string };
  driverLocation?: { lat: number; lng: number; name: string };
  interactivePinPlacement?: boolean;
  onLocationSelected?: (lat: number, lng: number) => void;
  height?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center,
  zoom = 14,
  restaurantLocation,
  customerLocation,
  driverLocation,
  interactivePinPlacement = false,
  onLocationSelected,
  height = '350px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Fix leaflet icon default asset paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | وصّلني سوريا',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;
      mapInstanceRef.current = map;

      if (interactivePinPlacement && onLocationSelected) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          onLocationSelected(e.latlng.lat, e.latlng.lng);
        });
      }
    } else {
      mapInstanceRef.current.setView(center, zoom);
    }

    return () => {
      // Keep map alive or cleanup on unmount
    };
  }, []);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    const latLngs: L.LatLngExpression[] = [];

    // 1. Restaurant Marker (Amber/Orange)
    if (restaurantLocation) {
      const restIcon = L.divIcon({
        className: 'custom-rest-marker',
        html: `<div style="background-color: #f97316; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white; font-size: 18px;">🏪</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const m = L.marker([restaurantLocation.lat, restaurantLocation.lng], { icon: restIcon })
        .bindPopup(`<b>مطعم: ${restaurantLocation.name}</b><br/>نقطة استلام الطلب`);
      markersGroup.addLayer(m);
      latLngs.push([restaurantLocation.lat, restaurantLocation.lng]);
    }

    // 2. Customer Marker (Emerald)
    if (customerLocation) {
      const custIcon = L.divIcon({
        className: 'custom-cust-marker',
        html: `<div style="background-color: #10b981; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white; font-size: 18px;">📍</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const m = L.marker([customerLocation.lat, customerLocation.lng], { icon: custIcon })
        .bindPopup(`<b>موقع العميل</b><br/>${customerLocation.address}`);
      markersGroup.addLayer(m);
      latLngs.push([customerLocation.lat, customerLocation.lng]);
    }

    // 3. Driver Marker (Sky Blue Motorcycle with animation pulse)
    if (driverLocation) {
      const driverIcon = L.divIcon({
        className: 'custom-driver-marker',
        html: `<div style="position: relative; width: 38px; height: 38px;">
          <div style="position: absolute; inset: 0; background-color: #0284c7; opacity: 0.4; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; background-color: #0284c7; color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(2,132,199,0.5); border: 2px solid white; font-size: 20px;">🛵</div>
        </div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const m = L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon })
        .bindPopup(`<b>الكابتن: ${driverLocation.name}</b><br/>موقع المندوب المباشر`);
      markersGroup.addLayer(m);
      latLngs.push([driverLocation.lat, driverLocation.lng]);
    }

    // Draw route polyline between points if 2 or more exist
    if (latLngs.length >= 2) {
      const polyline = L.polyline(latLngs, {
        color: '#f59e0b',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.8,
      }).addTo(map);
      polylineRef.current = polyline;

      // Fit bounds nicely with padding
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (latLngs.length === 1) {
      map.setView(latLngs[0], zoom);
    }
  }, [center, zoom, restaurantLocation, customerLocation, driverLocation]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-inner border border-stone-200" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      {interactivePinPlacement && (
        <div className="absolute top-2 right-2 bg-stone-900/85 backdrop-blur-xs text-white text-[11px] font-medium py-1.5 px-3 rounded-lg shadow-md pointer-events-none z-10">
          انقر على الخريطة لتثبيت موقع التوصيل بدقة 📍
        </div>
      )}
    </div>
  );
};
