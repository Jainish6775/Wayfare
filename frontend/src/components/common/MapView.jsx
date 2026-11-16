import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiCompass, FiCalendar, FiDollarSign } from 'react-icons/fi';
import famousCitiesData from '../../data/famousCities';
import './MapView.css';

// Fix Leaflet's default marker asset URLs in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper component to center and zoom map when active stop changes
function MapFocusController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom, { duration: 1 });
    }
  }, [center, zoom, map]);
  return null;
}

const createNumberedIcon = (number, isActive) => {
  return L.divIcon({
    className: 'custom-leaflet-marker-wrap',
    html: `<div class="leaflet-node-pin ${isActive ? 'active' : ''}"><span>${number}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const resolveCoords = (stop, index) => {
  if (stop.latitude && stop.longitude) {
    return [Number(stop.latitude), Number(stop.longitude)];
  }
  const stopName = (stop.title || stop.destination_name || '').toLowerCase();
  const city = famousCitiesData.find(c => 
    stopName.includes(c.name.toLowerCase()) || 
    c.name.toLowerCase().includes(stopName) ||
    (c.country && stopName.includes(c.country.toLowerCase()))
  );
  if (city && city.latitude && city.longitude) {
    return [city.latitude, city.longitude];
  }

  // Fallback spread coordinates across sample destinations
  const fallbackCoords = [
    [35.0116, 135.7681], // Kyoto
    [35.6762, 139.6503], // Tokyo
    [48.8566, 2.3522],   // Paris
    [41.9028, 12.4964],  // Rome
    [46.0207, 7.7491],   // Zermatt
    [-8.4095, 115.1889], // Bali
  ];
  return fallbackCoords[index % fallbackCoords.length];
};

export default function MapView({ stops = [] }) {
  const [activeStopIndex, setActiveStopIndex] = useState(0);

  if (!stops || stops.length === 0) {
    return (
      <div className="map-view-container empty-map-state p-6 text-center">
        <FiCompass size={32} className="text-neutral-400 mb-2" />
        <h4 className="font-bold text-sm text-neutral-700">Route & Destinations Map</h4>
        <p className="text-xs text-neutral-500 mt-1">
          No route sections added yet. Add sections to preview the map route!
        </p>
      </div>
    );
  }

  // Pre-process stops with resolved coordinates
  const mappedStops = stops.map((stop, idx) => ({
    ...stop,
    coords: resolveCoords(stop, idx),
  })).filter(s => s.coords !== null);

  const selectedStop = mappedStops[activeStopIndex] || mappedStops[0] || stops[0];
  const centerCoords = selectedStop?.coords || [35.0116, 135.7681];
  const polylinePositions = mappedStops.map(s => s.coords);

  return (
    <div className="map-view-container">
      
      {/* Route Graphic Canvas Box with Leaflet Map */}
      <div className="route-canvas-box">
        <div className="route-canvas-header">
          <span className="route-live-badge">📍 {mappedStops.length} Route Legs</span>
          <span className="route-subtitle font-bold text-xs">{selectedStop?.title || 'Route Map'}</span>
        </div>

        {/* Live Interactive Leaflet Map */}
        <div className="route-map-leaflet-wrapper">
          <MapContainer
            center={centerCoords}
            zoom={5}
            scrollWheelZoom={false}
            className="route-leaflet-container"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            
            <MapFocusController center={centerCoords} zoom={5} />

            {/* Polyline connecting stops */}
            {polylinePositions.length > 1 && (
              <Polyline
                positions={polylinePositions}
                pathOptions={{
                  color: '#3b82f6',
                  weight: 3,
                  opacity: 0.85,
                  dashArray: '6, 6',
                }}
              />
            )}

            {/* Markers */}
            {mappedStops.map((stop, idx) => (
              <Marker
                key={stop.id || idx}
                position={stop.coords}
                icon={createNumberedIcon(idx + 1, idx === activeStopIndex)}
                eventHandlers={{
                  click: () => setActiveStopIndex(idx),
                }}
              >
                <Popup className="saas-leaflet-popup">
                  <div className="popup-inner">
                    <span className="popup-badge">Leg {idx + 1}</span>
                    <strong className="popup-title">{stop.title || `Stage ${idx + 1}`}</strong>
                    {stop.startDate && (
                      <span className="popup-meta">📅 {stop.startDate}</span>
                    )}
                    {stop.budget > 0 && (
                      <span className="popup-meta text-success">💰 ${Number(stop.budget).toLocaleString()}</span>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Route Stops Cards Grid */}
      <div className="route-stops-feed mt-3">
        {mappedStops.map((stop, idx) => (
          <div 
            key={stop.id || idx}
            className={`route-leg-card ${idx === activeStopIndex ? 'active-leg' : ''}`}
            onClick={() => setActiveStopIndex(idx)}
          >
            <div className="leg-badge">Leg {idx + 1}</div>
            <div className="leg-info">
              <h5 className="leg-title">{stop.title || `Section ${idx + 1}`}</h5>
              <div className="leg-meta-row mt-1">
                <span className="leg-meta"><FiCalendar size={11} /> {stop.startDate || 'Date TBD'}</span>
                {stop.budget > 0 && (
                  <span className="leg-meta font-bold text-emerald-600">
                    <FiDollarSign size={11} /> ${Number(stop.budget).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
