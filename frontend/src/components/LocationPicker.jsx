import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Map as MapIcon, X, LocateFixed } from "lucide-react";
import PlaceInput from "./PlaceInput";
import { reverseGeocode } from "../utils/geo";

const DEFAULT_CENTER = [21.4624, 80.1961]; // Gondia

const pinIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 6px rgba(0,0,0,.5)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function ClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function MapPickerModal({ title, onClose, onSelect }) {
  const [pin, setPin] = useState(null); // [lat, lng]
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookup = async (lat, lng) => {
    setPin([lat, lng]);
    setLoading(true);
    setError("");
    try {
      const text = await reverseGeocode(lat, lng);
      setAddress(text);
      if (!text) setError("No address found here. Try another spot.");
    } catch {
      setAddress("");
      setError("Couldn't read this location. Check your internet and try again.");
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => lookup(pos.coords.latitude, pos.coords.longitude),
      () => setError("Couldn't get your current location."),
    );
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      style={{ zIndex: 5000 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900">
            <X size={20} />
          </button>
        </div>

        <div style={{ height: 380, isolation: "isolate" }} className="relative">
          <MapContainer
            center={pin || DEFAULT_CENTER}
            zoom={11}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onPick={lookup} />
            {pin && (
              <Marker
                position={pin}
                icon={pinIcon}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const p = e.target.getLatLng();
                    lookup(p.lat, p.lng);
                  },
                }}
              />
            )}
          </MapContainer>

          <button
            type="button"
            onClick={useMyLocation}
            style={{ zIndex: 1000 }}
            className="absolute top-3 right-3 flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <LocateFixed size={16} className="text-blue-600" />
            My location
          </button>
        </div>

        <div className="px-5 py-4 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            {pin ? "Selected location" : "Tap anywhere on the map to drop a pin"}
          </p>
          <p className="font-medium text-slate-900 mt-1 min-h-6">
            {loading ? "Finding address..." : address}
          </p>
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!address || loading}
              onClick={() => {
                onSelect(address);
                onClose();
              }}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use this location
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// The field: type OR pick on the map
export default function LocationPicker({
  name,
  value,
  onChange,
  placeholder,
  className,
  pickerTitle = "Choose location on map",
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <div className="flex-1">
          <PlaceInput
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Choose on map"
          className="shrink-0 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 font-medium"
        >
          <MapIcon size={18} />
          <span className="hidden sm:inline">Map</span>
        </button>
      </div>

      {open && (
        <MapPickerModal
          title={pickerTitle}
          onClose={() => setOpen(false)}
          onSelect={(addr) => onChange({ target: { name, value: addr } })}
        />
      )}
    </>
  );
}
