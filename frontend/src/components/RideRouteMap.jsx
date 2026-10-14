import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { geocode, getRoute } from "../utils/geo";

const dot = (color, label = "") =>
  L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 6px rgba(0,0,0,.5);color:#fff;font:700 10px/14px sans-serif;text-align:center">${label}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

const startIcon = dot("#2563eb");
const endIcon = dot("#16a34a");
const stopIcon = (n) => dot("#f59e0b", n);

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(points, { padding: [30, 30] });
  }, [map, points]);
  return null;
}

// Shows the driving route between a ride's from/to place names,
// passing through its stops (array of place-name strings).
export default function RideRouteMap({ from, to, stops = [], height = 320 }) {
  const stopsKey = stops.join("|");
  const key = `${from}|${stopsKey}|${to}`;
  const [result, setResult] = useState({ key: "" });

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;

    (async () => {
      try {
        const names = [from, ...(stopsKey ? stopsKey.split("|") : []), to];
        const found = [];

        for (let i = 0; i < names.length; i++) {
          const point = await geocode(names[i]);
          if (cancelled) return;
          found.push({ name: names[i], role: i === 0 ? "start" : i === names.length - 1 ? "end" : "stop", point });
        }

        // start and destination are required; a stop we can't find is skipped
        if (!found[0].point || !found[found.length - 1].point) {
          const missing = !found[0].point ? from : to;
          setResult({ key, status: "error", message: `Couldn't find "${missing}" on the map.` });
          return;
        }

        const usable = found.filter((item) => item.point);
        const missingStops = found.filter((item) => !item.point).map((item) => item.name);

        const route = await getRoute(usable.map((item) => item.point));
        if (cancelled) return;

        if (!route) {
          setResult({ key, status: "error", message: "No driving route found." });
          return;
        }

        setResult({ key, status: "ready", usable, route, missingStops });
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
  }, [from, to, stopsKey, key]);

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
              {state.usable.map((item, i) => {
                const stopNumber = state.usable.slice(0, i).filter((x) => x.role === "stop").length + 1;
                return (
                  <Marker
                    key={`${item.name}-${i}`}
                    position={[item.point.lat, item.point.lng]}
                    icon={
                      item.role === "start"
                        ? startIcon
                        : item.role === "end"
                          ? endIcon
                          : stopIcon(stopNumber)
                    }
                  >
                    <Tooltip direction="top" offset={[0, -10]}>
                      {item.name}
                    </Tooltip>
                  </Marker>
                );
              })}
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
          {state.missingStops.length > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              Couldn&apos;t place on the map: {state.missingStops.join(", ")}
            </p>
          )}
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
