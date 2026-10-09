import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, MessageSquareText } from "lucide-react";
import StarRating from "./StarRating";

// Popup listing the reviews past passengers wrote about a driver.
// Fetches its own data, so RideDetails only needs to open/close it.
function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// "Muskan Patle" -> "Muskan P." (keeps passengers a bit more private)
function shortName(name = "") {
  const [first, ...rest] = name.trim().split(" ");
  if (!first) return "Passenger";
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
}

export default function DriverReviewsModal({ driverId, driverName, apiUrl, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(`${apiUrl}/reviews/driver/${driverId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((json) => !cancelled && setData(json))
      .catch(() => !cancelled && setError("Couldn't load reviews. Try again."));

    return () => {
      cancelled = true;
    };
  }, [driverId, apiUrl]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Portal: renders on <body> so the page's glass/blur effects don't clip it
  return createPortal(
    <div
      style={{ zIndex: 5000 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Reviews for {driverName}
            </h3>
            {data && data.reviewCount > 0 && (
              <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                <StarRating value={Math.round(data.averageRating)} size={16} />
                {data.averageRating.toFixed(1)} · {data.reviewCount} review
                {data.reviewCount === 1 ? "" : "s"}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-4">
          {!data && !error && <p className="text-slate-500">Loading reviews...</p>}
          {error && <p className="text-red-600">{error}</p>}

          {data && data.reviews.length === 0 && (
            <p className="text-slate-500 text-center py-6">No reviews yet.</p>
          )}

          {data?.reviews.map((review) => (
            <div key={review.id} className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                    {review.passenger_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      {shortName(review.passenger_name)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(review.created_at)}
                    </p>
                  </div>
                </div>
                <StarRating value={review.rating} size={16} />
              </div>

              {review.comment ? (
                <p className="text-slate-700 text-sm mt-3">{review.comment}</p>
              ) : (
                <p className="flex items-center gap-1.5 text-slate-400 text-sm mt-3">
                  <MessageSquareText size={14} />
                  Rated without a written comment
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
