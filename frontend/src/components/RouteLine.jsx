import { CarFront, Car } from "lucide-react";

// Signature visual: a route line connecting FROM and TO with a small
// car that continuously travels along it.
function RouteLine({ orientation = "vertical" }) {
  if (orientation === "horizontal") {
    return (
      <div className="relative flex items-center gap-2 w-full min-w-[60px]">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />

        <div className="relative flex-1 border-t-2 border-dashed border-white/50">
          <span className="route-car-x absolute top-1/2 -translate-y-1/2">
            <Car
              size={20}
              className="text-blue-500 fill-white"
            />
          </span>
        </div>

        <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center h-full">
      <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0 shadow-lg shadow-blue-500/50" />

      <div className="relative flex-1 w-0 border-l-2 border-dashed border-white/50 my-1">
        <span className="route-car-y absolute left-1/2 -translate-x-1/2">
          <CarFront
            size={30}
            className="text-blue-400 fill-white"
          />
        </span>
      </div>

      <span className="w-3 h-3 rounded-full bg-green-500 shrink-0 shadow-lg shadow-green-500/50" />
    </div>
  );
}

export default RouteLine;