import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import NotificationBell from "./NotificationBell";

const SIZE = 52; // bubble size in px
const MARGIN = 10; // gap kept from the screen edges
const BOTTOM_SPACE = 88; // keeps the bubble clear of the bottom nav bar
const TOP_SPACE = 10;
const STORAGE_KEY = "ridesync-bell-position";

function clamp(pos) {
  const maxX = window.innerWidth - SIZE - MARGIN;
  const maxY = window.innerHeight - SIZE - BOTTOM_SPACE;
  return {
    x: Math.min(Math.max(pos.x, MARGIN), Math.max(maxX, MARGIN)),
    y: Math.min(Math.max(pos.y, TOP_SPACE), Math.max(maxY, TOP_SPACE)),
  };
}

function loadPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved.x === "number") return clamp(saved);
  } catch {
    // ignore, fall back to the default spot
  }
  // default: top right, just under the top bar
  return clamp({ x: window.innerWidth - SIZE - MARGIN, y: 90 });
}

// A round notification bubble you can drag anywhere. Tap to open the list.
// It snaps to the nearest left/right edge when released and remembers its spot.
export default function FloatingBell() {
  const { user } = useAuth();
  const [pos, setPos] = useState(loadPosition);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ active: false, moved: false, startX: 0, startY: 0, offX: 0, offY: 0 });

  // keep the bubble on screen if the window changes size / rotates
  useEffect(() => {
    const onResize = () => setPos((p) => clamp(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!user?.id) return null;

  const onPointerDown = (e) => {
    drag.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      offX: e.clientX - pos.x,
      offY: e.clientY - pos.y,
    };
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d.active) return;

    // small movements still count as a tap
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 6) return;

    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setPos(clamp({ x: e.clientX - d.offX, y: e.clientY - d.offY }));
  };

  const onPointerUp = () => {
    const d = drag.current;
    d.active = false;
    if (!d.moved) return;

    setDragging(false);
    // snap to the nearest side edge
    setPos((p) => {
      const snapped = clamp({
        x: p.x + SIZE / 2 < window.innerWidth / 2 ? MARGIN : window.innerWidth,
        y: p.y,
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapped));
      } catch {
        // storage unavailable: position just won't be remembered
      }
      return snapped;
    });
  };

  // After a drag, swallow the click so the list doesn't open by accident
  const onClickCapture = (e) => {
    if (drag.current.moved) {
      e.stopPropagation();
      e.preventDefault();
      drag.current.moved = false;
    }
  };

  // open the list toward the middle of the screen so it never goes off-screen
  const onLeft = pos.x + SIZE / 2 < window.innerWidth / 2;
  const inLowerHalf = pos.y + SIZE / 2 > window.innerHeight / 2;
  const dropdownClassName = `${onLeft ? "left-0" : "right-0"} ${
    inLowerHalf ? "bottom-14" : "top-14"
  }`;

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
      style={{
        left: pos.x,
        top: pos.y,
        width: SIZE,
        height: SIZE,
        zIndex: 60,
        touchAction: "none", // stops the page scrolling while dragging
        transition: dragging ? "none" : "left 0.2s ease, top 0.2s ease",
      }}
      className={`md:hidden fixed flex items-center justify-center rounded-full bg-white/90 backdrop-blur border border-white shadow-xl ${
        dragging ? "scale-110 cursor-grabbing" : "cursor-grab"
      }`}
    >
      <NotificationBell dropdownClassName={dropdownClassName} />
    </div>
  );
}
