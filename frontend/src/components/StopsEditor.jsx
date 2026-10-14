import { ArrowDown, ArrowUp, Plus, Trash2, Lock } from "lucide-react";
import LocationPicker from "./LocationPicker";
import { MAX_STOPS, newStop } from "../utils/stops";

// Lets the driver add stops along the route, each with a price from the start.
// `stops` is an array of { id, location, fare }.
export default function StopsEditor({
  stops,
  onChange,
  fromName = "",
  toName = "",
  totalPrice,
  disabled = false,
  disabledReason = "",
}) {
  const update = (index, changes) =>
    onChange(stops.map((stop, i) => (i === index ? { ...stop, ...changes } : stop)));

  const remove = (index) => onChange(stops.filter((_, i) => i !== index));

  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= stops.length) return;
    const copy = stops.slice();
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(copy);
  };

  const hasTotal = Number.isFinite(totalPrice) && totalPrice > 0;

  return (
    <div className="border-t border-slate-200 mt-8 pt-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Stops on the way</h2>
          <p className="text-sm text-slate-600 mt-1">
            Add places you pass, in order, so people travelling to or from
            them can join your ride. Optional.
          </p>
        </div>

        {disabled && (
          <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            <Lock size={13} />
            Locked
          </span>
        )}
      </div>

      {disabled && disabledReason && (
        <p className="text-sm text-amber-700 mt-3">{disabledReason}</p>
      )}

      <div className="mt-5 space-y-4">
        {stops.map((stop, index) => {
          const fare = Number(stop.fare);
          const showHint = hasTotal && stop.fare !== "" && Number.isFinite(fare) && fare <= totalPrice;

          return (
            <div
              key={stop.id}
              className="bg-white border border-slate-200 rounded-xl p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-sm font-bold">
                  {index + 1}
                </span>

                {!disabled && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      title="Move up"
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === stops.length - 1}
                      title="Move down"
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      title="Remove stop"
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Stop location
                  </label>

                  {disabled ? (
                    <p className="px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-800">
                      {stop.location}
                    </p>
                  ) : (
                    <LocationPicker
                      name={`stop-${stop.id}`}
                      value={stop.location}
                      onChange={(event) => update(index, { location: event.target.value })}
                      placeholder="e.g. Tirora"
                      pickerTitle={`Choose stop ${index + 1} on the map`}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Price from start (₹)
                  </label>

                  {disabled ? (
                    <p className="px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-800">
                      ₹{stop.fare}
                    </p>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      value={stop.fare}
                      onChange={(event) => update(index, { fare: event.target.value })}
                      placeholder="e.g. 40"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                    />
                  )}
                </div>
              </div>

              {showHint && (
                <p className="text-xs text-slate-500 mt-3">
                  {fromName || "Start"} → this stop: <b>₹{fare}</b>
                  {" · "}
                  Boarding here to {toName || "the destination"}: <b>₹{totalPrice - fare}</b>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={() => onChange([...stops, newStop()])}
          disabled={stops.length >= MAX_STOPS}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-blue-600 text-blue-600 font-medium hover:bg-blue-50 disabled:opacity-40"
        >
          <Plus size={16} />
          {stops.length === 0 ? "Add a stop" : "Add another stop"}
        </button>
      )}

      {stops.length > 0 && !disabled && (
        <p className="text-xs text-slate-500 mt-3">
          &quot;Price from start&quot; is what a passenger pays for riding from{" "}
          {fromName || "the start"} to that stop. It must go up from one stop to
          the next and stay at or below the full ride price.
        </p>
      )}
    </div>
  );
}
