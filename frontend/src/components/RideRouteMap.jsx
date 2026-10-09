import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { geocode, getRoute } from "../utils/geo";

const dot = (color) =>
  L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 6px rgba(0,0,0,.5)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const startIcon = dot("#2563eb");
const endIcon = dot("#16a34a");

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(points, { padding: [30, 30] });
  }, [map, points]);
  return null;
}

// Shows the driving route between a ride's from/to place names.
export default function RideRouteMap({ from, to, height = 320 }) {
  // The result remembers which from/to it belongs to, so "loading" can be
  // worked out while rendering (no setState needed at the start of the effect).
  const key = `${from}|${to}`;
  const [result, setResult] = useState({ key: "" });

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;

    (async () => {
      try {
        const a = await geocode(from);
        const b = await geocode(to);
        if (cancelled) return;

        if (!a || !b) {
          setResult({
            key,
            status: "error",
            message: `Couldn't find "${!a ? from : to}" on the map.`,
          });
          return;
        }

        const route = await getRoute(a, b);
        if (cancelled) return;

        if (!route) {
          setResult({ key, status: "error", message: "No driving route found." });
          return;
        }
        setResult({ key, status: "ready", a, b, route });
      } catch (err) {
        console.error("Route error:", err);
        if (!cancelled)
          setResult({
            key,
            status: "error",
            message: "Couldn't load the route. Check your internet connection.",
          });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [from, to, key]);

  const state = result.key === key ? result : { status: "loading" };
  const ready = state.status === "ready";

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
      <div style={{ height, width: "100%", isolation: "isolate" }} className="relative">
        <MapContainer
          center={[21.4624, 80.1961]}
          zoom={8}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {ready && (
            <>
              <Polyline positions={state.route.path} pathOptions={{ color: "#2563eb", weight: 5 }} />
              <Marker position={[state.a.lat, state.a.lng]} icon={startIcon} />
              <Marker position={[state.b.lat, state.b.lng]} icon={endIcon} />
              <FitBounds points={state.route.path} />
            </>
          )}
        </MapContainer>

        {state.status === "loading" && (
          <div
            style={{ zIndex: 1000 }}
            className="absolute top-3 left-3 px-3 py-1.5 bg-white rounded-lg shadow text-sm text-slate-600"
          >
            Loading route...
          </div>
        )}
      </div>

      {ready && (
        <div className="px-4 py-2.5 text-sm text-slate-700 border-t border-slate-200">
          Distance: <b>{state.route.km} km</b> · Drive time: <b>{state.route.mins} min</b>
        </div>
      )}
      {state.status === "error" && (
        <div className="px-4 py-2.5 text-sm text-red-600 border-t border-slate-200">
          {state.message}
        </div>
      )}
    </div>
  );
}
