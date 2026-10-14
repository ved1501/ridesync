// Free map helpers: OpenStreetMap Nominatim (search) + OSRM (routing).
// No API key or billing needed. These public servers are meant for light use.

const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSRM = "https://router.project-osrm.org";
const CACHE_KEY = "ridesync-geocode-cache";

// ---------- small cache, so the same place is looked up only once ----------
const geocodeCache = new Map();

try {
  const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  Object.entries(saved).forEach(([key, value]) => geocodeCache.set(key, value));
} catch {
  // storage not available: the cache just lives in memory
}

function saveCache() {
  try {
    const recent = Array.from(geocodeCache.entries()).slice(-200);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(recent)));
  } catch {
    // ignore
  }
}

// ---------- the free server allows about 1 request per second ----------
let lastRequestAt = 0;

async function throttle() {
  const wait = 1100 - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
}

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

    await throttle();
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = await res.json();
    if (data.length) {
      const point = { lat: Number(data[0].lat), lng: Number(data[0].lon) };
      geocodeCache.set(key, point);
      saveCache();
      return point;
    }
  }
  return null;
}

// Driving route through a list of points: [{ lat, lng }, ...]
// (start, every stop in order, destination)
export async function getRoute(points) {
  const coordinates = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
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
