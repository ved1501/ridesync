import { useState } from "react";
import { Star } from "lucide-react";

// Interactive when onChange is provided (rating input form).
// Read-only display when onChange is omitted (showing an average rating).
function StarRating({ value = 0, onChange, size = 22 }) {
  const [hoverValue, setHoverValue] = useState(0);

  const isInteractive = typeof onChange === "function";
  const displayValue = isInteractive && hoverValue ? hoverValue : value;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!isInteractive}
          onClick={() => isInteractive && onChange(star)}
          onMouseEnter={() => isInteractive && setHoverValue(star)}
          onMouseLeave={() => isInteractive && setHoverValue(0)}
          className={isInteractive ? "cursor-pointer" : "cursor-default"}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
        >
          <Star
            size={size}
            className={
              star <= displayValue
                ? "fill-yellow-400 text-yellow-400"
                : "fill-transparent text-slate-300"
            }
          />
        </button>
      ))}
    </div>
  );
}

export default StarRating;
