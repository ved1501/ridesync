// Free map helpers: OpenStreetMap Nominatim (search) + OSRM (routing).
// No API key or billing needed. These public servers are meant for light use.

const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSRM = "https://router.project-osrm.org";

const geocodeCache = new Map();

// "Dhapewada, Gondia, Maharashtra, India" -> short readable label
function shortLabel(displayName) {
  return displayName.split(",").slice(0, 3).map((s) => s.trim()).join(", ");
}

// Autocomplete suggestions while typing
export async function searchPlaces(query, signal) {
  const url =
    `${NOMINATIM}/search?format=jsonv2&limit=5&countrycodes=in` +
    `&accept-language=en&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Search failed");
  const data = await res.json();
  return data.map((p) => ({
    label: shortLabel(p.display_name),
    lat: Number(p.lat),
    lng: Number(p.lon),
  }));
}

// Coordinates -> address text (used when picking on the map)
export async function reverseGeocode(lat, lng) {
  const url =
    `${NOMINATIM}/reverse?format=jsonv2&zoom=16&accept-language=en` +
    `&lat=${lat}&lon=${lng}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Reverse geocoding failed");
  const data = await res.json();
  if (!data.display_name) return "";
  return shortLabel(data.display_name);
}

// Place name text -> coordinates (used to draw a ride's route).
// If the full text isn't found, retries with fewer leading parts.
export async function geocode(text) {
  const key = text.trim().toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key);

  const parts = text.split(",").map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const q = parts.slice(i).join(", ");
    const url =
      `${NOMINATIM}/search?format=jsonv2&limit=1&countrycodes=in` +
      `&accept-language=en&q=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = await res.json();
    if (data.length) {
      const point = { lat: Number(data[0].lat), lng: Number(data[0].lon) };
      geocodeCache.set(key, point);
      return point;
    }
  }
  return null;
}

// Driving route between two coordinates
export async function getRoute(a, b) {
  const url =
    `${OSRM}/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}` +
    `?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Routing failed");
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) return null;
  return {
    // GeoJSON is [lng, lat]; Leaflet wants [lat, lng]
    path: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    km: (route.distance / 1000).toFixed(1),
    mins: Math.round(route.duration / 60),
  };
}