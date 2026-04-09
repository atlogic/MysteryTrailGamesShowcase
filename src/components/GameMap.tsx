import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Checkpoint } from '../types';

// Fix for default marker icons in Leaflet with React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const PlayerIcon = L.divIcon({
  className: 'player-marker',
  html: `<div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const TargetIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface GameMapProps {
  userLocation: { lat: number; lng: number } | null;
  targetCheckpoint: Checkpoint;
  previousCheckpoints: Checkpoint[];
  viewMode: 'map' | 'satellite';
  threshold: number;
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(center);
  }, [center, map]);
  return null;
}

export const GameMap: React.FC<GameMapProps> = ({ 
  userLocation, 
  targetCheckpoint, 
  previousCheckpoints, 
  viewMode,
  threshold
}) => {
  const center: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lng] 
    : [targetCheckpoint.lat || 0, targetCheckpoint.lng || 0];

  const tileUrl = viewMode === 'satellite'
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png';

  const attribution = viewMode === 'satellite'
    ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  // Path coordinates: previous points -> player -> current target
  const pathPoints: [number, number][] = [
    ...previousCheckpoints
      .filter(cp => cp.lat !== undefined && cp.lng !== undefined)
      .map(cp => [cp.lat!, cp.lng!] as [number, number]),
    ...(userLocation ? [[userLocation.lat, userLocation.lng] as [number, number]] : []),
    [targetCheckpoint.lat!, targetCheckpoint.lng!] as [number, number]
  ];

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-inner border-2 border-blue-100">
      <MapContainer 
        center={center} 
        zoom={16} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer url={tileUrl} attribution={attribution} />
        
        <MapController center={center} />

        {/* Previous Points */}
        {previousCheckpoints.map((cp, i) => (
          cp.lat !== undefined && cp.lng !== undefined && (
            <Marker key={cp.id} position={[cp.lat, cp.lng]} icon={DefaultIcon}>
              <Popup>
                <div className="font-bold">{cp.name}</div>
              </Popup>
            </Marker>
          )
        ))}

        {/* Current Target */}
        {targetCheckpoint.lat !== undefined && targetCheckpoint.lng !== undefined && (
          <>
            <Marker position={[targetCheckpoint.lat, targetCheckpoint.lng]} icon={TargetIcon}>
              <Popup>
                <div className="font-bold text-green-600">{targetCheckpoint.name}</div>
              </Popup>
            </Marker>
            <Circle 
              center={[targetCheckpoint.lat, targetCheckpoint.lng]} 
              radius={threshold} 
              pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2 }} 
            />
          </>
        )}

        {/* Player */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={PlayerIcon} />
        )}

        {/* Path */}
        <Polyline 
          positions={pathPoints} 
          pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '10, 10', opacity: 0.6 }} 
        />
      </MapContainer>
    </div>
  );
};
