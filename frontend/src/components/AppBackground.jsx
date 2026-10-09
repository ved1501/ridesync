import { useState, useEffect } from "react";

// Fixed full-viewport background that continuously crossfades between a set
// of images. Mount this once at the app's top level (e.g. in App.jsx) so
// every page shares the same slideshow instead of each page re-rendering
// its own background.
function AppBackground({ images = [], intervalMs = 6000 }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;

    const timer = setInterval(() => {
      setIndex((previous) => (previous + 1) % images.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

  if (images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}

      {/* Overlay for text/card legibility over busy photos */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(120deg, rgba(8,10,26,0.55) 0%, rgba(8,10,26,0.32) 50%, rgba(8,10,26,0.2) 100%)",
        }}
      />
    </div>
  );
}

export default AppBackground;
