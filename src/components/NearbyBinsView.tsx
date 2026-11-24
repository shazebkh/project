import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation as NavIcon,
  RefreshCw,
  CheckCircle,
  Footprints,
  Flame,
  Search,
  Crosshair,
  SlidersHorizontal,
  Info,
  ExternalLink,
} from 'lucide-react';
import L from 'leaflet';
import { Bin, BinType } from '../types';
import { api } from '../services/apiClient';

interface NearbyBinsViewProps {
  onStartWalkToBin?: (binId: string) => void;
}

export const NearbyBinsView: React.FC<NearbyBinsViewProps> = ({ onStartWalkToBin }) => {
  const [bins, setBins] = useState<Array<Bin & { distance_m: number }>>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number }>({ lat: 28.6692, lng: 77.4538 });
  const [selectedBin, setSelectedBin] = useState<(Bin & { distance_m: number }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [viewMode, setViewMode] = useState<'both' | 'mapOnly' | 'listOnly'>('both');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Initialize GPS on load
  useEffect(() => {
    handleLocateMe();
  }, []);

  const handleLocateMe = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLoc(loc);
          setIsLocating(false);
          loadBins(loc.lat, loc.lng);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([loc.lat, loc.lng], 15);
          }
        },
        (err) => {
          console.warn('Geolocation error or denied, using default:', err);
          setIsLocating(false);
          loadBins(userLoc.lat, userLoc.lng);
        },
        { enableHighAccuracy: true, timeout: 6000 },
      );
    } else {
      setIsLocating(false);
      loadBins(userLoc.lat, userLoc.lng);
    }
  };

  const loadBins = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      // 3000m = 3km
      const res = await api.getNearbyBins(lat, lng, 3000);
      setBins(res.bins);
    } catch (err) {
      console.error('Failed to load nearby bins:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLoc.lat, userLoc.lng],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map markers and 3km radius circle when bins or user location change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Update user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background-color: rgba(59, 130, 246, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 20px; height: 20px; border-radius: 9999px; background-color: #2563eb; border: 3px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px;"></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    userMarkerRef.current = L.marker([userLoc.lat, userLoc.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup('<b>Your Current Location</b><br>Searching bins within 3 km');

    // Update 3 km radius circle
    if (circleRef.current) {
      circleRef.current.remove();
    }

    circleRef.current = L.circle([userLoc.lat, userLoc.lng], {
      radius: 3000, // 3 km radius
      color: '#059669',
      weight: 2,
      dashArray: '6, 8',
      fillColor: '#10b981',
      fillOpacity: 0.08,
    }).addTo(map);

    // Update bin markers
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();

      const filteredBins = bins.filter((b) => {
        if (selectedType === 'all') return true;
        return b.bin_type === selectedType;
      });

      filteredBins.forEach((b) => {
        const markerColor =
          b.bin_type === 'recycling'
            ? '#2563eb'
            : b.bin_type === 'wet'
            ? '#059669'
            : b.bin_type === 'dry'
            ? '#d97706'
            : b.bin_type === 'hazardous'
            ? '#9333ea'
            : '#4b5563';

        const emoji =
          b.bin_type === 'recycling'
            ? '♻️'
            : b.bin_type === 'wet'
            ? '🍏'
            : b.bin_type === 'dry'
            ? '📦'
            : b.bin_type === 'hazardous'
            ? '☣️'
            : '🗑️';

        const binIcon = L.divIcon({
          className: 'custom-bin-marker',
          html: `
            <div style="background-color: ${markerColor}; color: white; width: 32px; height: 32px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.25); cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
              ${emoji}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([b.location.lat, b.location.lng], { icon: binIcon });

        const walkingMinutes = Math.max(1, Math.round(b.distance_m / 80)); // ~80m/min walking speed
        const calories = Math.round((b.distance_m / 100) * 5.1); // ~5.1 kcal per 100m

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 170px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-weight: 800; text-transform: uppercase; color: ${markerColor};">${b.bin_type || 'General'} Dustbin</span>
              ${b.verified ? '<span style="color: #059669; font-weight: bold;">✓ Verified</span>' : ''}
            </div>
            <div style="color: #4b5563; margin-bottom: 6px;">
              📍 <b>${b.distance_m}m away</b> (~${walkingMinutes} min walk)
            </div>
            <div style="color: #059669; font-weight: bold; margin-bottom: 8px;">
              🔥 Burn ~${calories} kcal walking here
            </div>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${b.location.lat},${b.location.lng}" target="_blank" rel="noreferrer" style="display: block; text-align: center; background: #059669; color: white; padding: 6px 10px; border-radius: 8px; font-weight: bold; text-decoration: none;">
              Open in Google Maps ↗
            </a>
          </div>
        `);

        marker.on('click', () => {
          setSelectedBin(b);
        });

        markersLayerRef.current?.addLayer(marker);
      });
    }
  }, [bins, selectedType, userLoc]);

  const handleSearchAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressSearch) return;

    // Simulate geocoding search for demo addresses
    const searchLower = addressSearch.toLowerCase();
    let newLat = userLoc.lat;
    let newLng = userLoc.lng;

    if (searchLower.includes('san francisco') || searchLower.includes('sf')) {
      newLat = 37.7749;
      newLng = -122.4194;
    } else if (searchLower.includes('delhi') || searchLower.includes('connaught')) {
      newLat = 28.6692;
      newLng = 77.4538;
    } else if (searchLower.includes('new york') || searchLower.includes('manhattan')) {
      newLat = 40.7128;
      newLng = -74.0060;
    } else if (searchLower.includes('london')) {
      newLat = 51.5074;
      newLng = -0.1278;
    } else {
      // Offset slightly to simulate local neighborhood query
      newLat = userLoc.lat + 0.005;
      newLng = userLoc.lng + 0.005;
    }

    setUserLoc({ lat: newLat, lng: newLng });
    loadBins(newLat, newLng);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([newLat, newLng], 14);
    }
  };

  const filteredBins = bins.filter((b) => {
    if (selectedType === 'all') return true;
    return b.bin_type === selectedType;
  });

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      {/* 1. Header Hero Card */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-800 to-cyan-900 text-white p-5 shadow-xl border border-emerald-600/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider">
                Geospatial Bin Radar
              </span>
              <h3 className="text-xl font-black">Find Dustbins &lt; 3km</h3>
            </div>
          </div>
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors flex items-center space-x-1"
            title="Locate Me"
          >
            <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="text-[11px] font-bold hidden sm:inline">GPS</span>
          </button>
        </div>

        <p className="text-xs text-emerald-100/90 leading-relaxed">
          Interactive map of all verified municipal dustbins, dry recycling points, and organic compost drop-offs within your <strong>3 km walking perimeter</strong>.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearchAddress} className="mt-3 flex space-x-1.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={addressSearch}
              onChange={(e) => setAddressSearch(e.target.value)}
              placeholder="Search address, neighborhood or city..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white text-gray-800 text-xs focus:ring-2 focus:ring-emerald-400 focus:outline-hidden placeholder-gray-400 font-medium"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
          >
            Search
          </button>
        </form>
      </div>

      {/* 2. Category Filter Pills & View Toggles */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-gray-700 flex items-center space-x-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
            <span>Filter by Bin Type:</span>
          </span>
          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {filteredBins.length} bins within 3 km
          </span>
        </div>

        <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All Bins', emoji: '📍' },
            { id: 'recycling', label: 'Recycling', emoji: '♻️' },
            { id: 'general', label: 'General', emoji: '🗑️' },
            { id: 'wet', label: 'Wet Compost', emoji: '🍏' },
            { id: 'dry', label: 'Dry Waste', emoji: '📦' },
            { id: 'hazardous', label: 'Hazardous', emoji: '☣️' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center space-x-1 border ${
                selectedType === type.id
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{type.emoji}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Interactive Leaflet Map Container */}
      <div className="rounded-3xl overflow-hidden border border-gray-200 shadow-md bg-white relative">
        <div
          ref={mapContainerRef}
          className="w-full h-80 z-10"
          style={{ minHeight: '320px' }}
        />

        {/* Legend Badge Overlay */}
        <div className="absolute bottom-3 left-3 z-20 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl text-[10px] font-semibold text-gray-700 shadow-md border border-gray-200 flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            <span>You</span>
          </div>
          <span>•</span>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-600 inline-block border-dashed" />
            <span>3km Radius</span>
          </div>
        </div>

        {/* Reset / Center Map Control */}
        <button
          onClick={() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([userLoc.lat, userLoc.lng], 14);
            }
          }}
          className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-md border border-gray-200 text-gray-700 hover:bg-white"
          title="Center on me"
        >
          <Crosshair className="w-4 h-4 text-emerald-700" />
        </button>
      </div>

      {/* 4. Selected Bin Details or Nearest Bins List */}
      {selectedBin && (
        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-xs space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">
                {selectedBin.bin_type === 'recycling'
                  ? '♻️'
                  : selectedBin.bin_type === 'wet'
                  ? '🍏'
                  : selectedBin.bin_type === 'dry'
                  ? '📦'
                  : selectedBin.bin_type === 'hazardous'
                  ? '☣️'
                  : '🗑️'}
              </span>
              <div>
                <h4 className="font-bold text-sm text-gray-900 capitalize">
                  {selectedBin.bin_type || 'General'} Dustbin
                </h4>
                <p className="text-[11px] text-gray-500">
                  {selectedBin.distance_m} meters away (~{Math.max(1, Math.round(selectedBin.distance_m / 80))} min walk)
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedBin(null)}
              className="text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="bg-white p-2 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-gray-400 block font-semibold">Calories to Burn</span>
              <span className="font-bold text-emerald-700">
                ~{Math.round((selectedBin.distance_m / 100) * 5.1)} kcal
              </span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-gray-400 block font-semibold">Verification</span>
              <span className="font-bold text-blue-700">
                {selectedBin.verified ? '✓ Official Point' : 'Community Added'}
              </span>
            </div>
          </div>

          <div className="flex space-x-2 pt-1">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedBin.location.lat},${selectedBin.location.lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center justify-center space-x-1 hover:bg-emerald-100"
            >
              <span>Get Directions</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* 5. Nearest Dustbins List under 3km */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider">
            All Dustbins Within 3 km ({filteredBins.length})
          </h4>
          <span className="text-[11px] text-gray-500">Sorted by walking distance</span>
        </div>

        {filteredBins.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl border border-gray-100 p-4 text-xs text-gray-500">
            No bins found for this filter within 3 km.
          </div>
        ) : (
          filteredBins.map((bin) => {
            const walkingMinutes = Math.max(1, Math.round(bin.distance_m / 80));
            const calories = Math.round((bin.distance_m / 100) * 5.1);

            return (
              <div
                key={bin.id}
                onClick={() => {
                  setSelectedBin(bin);
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([bin.location.lat, bin.location.lng], 16);
                  }
                }}
                className={`p-3.5 rounded-2xl bg-white border transition-all cursor-pointer flex items-center justify-between ${
                  selectedBin?.id === bin.id
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      bin.bin_type === 'recycling'
                        ? 'bg-blue-50 text-blue-600'
                        : bin.bin_type === 'wet'
                        ? 'bg-emerald-50 text-emerald-600'
                        : bin.bin_type === 'dry'
                        ? 'bg-amber-50 text-amber-600'
                        : bin.bin_type === 'hazardous'
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {bin.bin_type === 'recycling'
                      ? '♻️'
                      : bin.bin_type === 'wet'
                      ? '🍏'
                      : bin.bin_type === 'dry'
                      ? '📦'
                      : bin.bin_type === 'hazardous'
                      ? '☣️'
                      : '🗑️'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-xs text-gray-900 capitalize">
                        {bin.bin_type || 'General'} Dustbin
                      </span>
                      {bin.verified && (
                        <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      <strong>{bin.distance_m} m</strong> away • ~{walkingMinutes} min walk
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-emerald-700 flex items-center justify-end space-x-0.5">
                    <Flame className="w-3 h-3 text-orange-500 fill-orange-400" />
                    <span>~{calories} kcal</span>
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {bin.source.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
