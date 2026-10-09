import { useRef, useState } from "react";
import { searchPlaces } from "../utils/geo";

// Text input with place suggestions (free, OpenStreetMap).
// Calls onChange({ target: { name, value } }) so your existing
// handleChange keeps working unchanged.
export default function PlaceInput({ name, value, onChange, placeholder, className }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const abortRef = useRef(null);

  const emit = (v) => onChange({ target: { name, value: v } });

  const handleInput = (e) => {
    const v = e.target.value;
    emit(v);
    clearTimeout(timerRef.current);
    abortRef.current?.abort();

    if (v.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    // Wait until the user pauses typing (the free server asks for light use)
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const results = await searchPlaces(v, controller.signal);
        setSuggestions(results);
        setOpen(true);
      } catch (err) {
        if (err.name !== "AbortError") console.error("Place search error:", err);
      }
    }, 600);
  };

  const pick = (s) => {
    emit(s.label);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleInput}
        onFocus={() => suggestions.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <li
              key={i}
              onMouseDown={() => pick(s)}
              className="px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer"
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
