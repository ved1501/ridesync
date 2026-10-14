// ============================================================
// Shared helpers for rides with intermediate stops.
//
// A ride has "points": index 0 = start, 1..n = stops, n+1 = destination.
// A passenger travels from a boarding point to a drop-off point.
// A seat is only taken on the parts of the route the passenger rides,
// so it is free again after they get off.
// ============================================================

export const MAX_STOPS = 8;

// A new empty stop row for the editor
export function newStop(location = "", fare = "", id) {
  return {
    id: id ?? Math.random().toString(36).slice(2),
    location,
    fare,
  };
}

// Checks the stops typed in the Offer / Edit form. Returns "" if fine.
export function validateStopsInput(stops, totalPrice, from = "", to = "") {
  if (stops.length > MAX_STOPS) {
    return `You can add at most ${MAX_STOPS} stops.`;
  }

  const used = new Set([from.trim().toLowerCase(), to.trim().toLowerCase()]);
  let previousFare = 0;

  for (let i = 0; i < stops.length; i++) {
    const location = stops[i].location.trim();
    const fare = Number(stops[i].fare);

    if (!location) return `Stop ${i + 1} needs a location.`;

    if (used.has(location.toLowerCase())) {
      return `Stop ${i + 1} (${location}) is already used in this route.`;
    }
    used.add(location.toLowerCase());

    if (stops[i].fare === "" || !Number.isFinite(fare) || fare < 0) {
      return `Stop ${i + 1} needs a price (0 or more).`;
    }

    if (fare < previousFare) {
      return `Stop ${i + 1} price cannot be lower than the previous stop.`;
    }

    if (Number.isFinite(totalPrice) && fare > totalPrice) {
      return `Stop ${i + 1} price cannot be more than the full ride price.`;
    }

    previousFare = fare;
  }

  return "";
}

// All points of a ride with the price from the start up to each point.
// `ride` needs: from, to, price and (optional) stops: [{ location, fare }]
export function buildPoints(ride) {
  const stops = ride.stops || [];

  return [
    { index: 0, location: ride.from, fare: 0 },
    ...stops.map((stop, i) => ({
      index: i + 1,
      location: stop.location,
      fare: Number(stop.fare),
    })),
    { index: stops.length + 1, location: ride.to, fare: Number(ride.price) },
  ];
}

// Price for riding from point `board` to point `drop`
export function fareBetween(ride, board, drop) {
  const points = buildPoints(ride);
  return points[drop].fare - points[board].fare;
}

// Seats still free for the whole stretch board -> drop
export function seatsBetween(ride, board, drop) {
  const occupancy = ride.occupancy || [];
  const capacity =
    ride.capacity ?? Number(ride.seatsAvailable ?? ride.seats_available ?? 0);

  let busiest = 0;
  for (let s = board; s < drop; s++) {
    if ((occupancy[s] ?? 0) > busiest) busiest = occupancy[s];
  }

  return Math.max(capacity - busiest, 0);
}

// Does the ride pass through the searched places in the right order?
// Returns { board, drop } (point indexes) or null.
export function matchStops(ride, fromQuery = "", toQuery = "") {
  const points = buildPoints(ride);
  const last = points.length - 1;

  const from = fromQuery.trim().toLowerCase();
  const to = toQuery.trim().toLowerCase();

  const has = (i, query) => points[i].location.toLowerCase().includes(query);

  if (!from && !to) return { board: 0, drop: last };

  if (from && !to) {
    for (let i = 0; i < last; i++) {
      if (has(i, from)) return { board: i, drop: last };
    }
    return null;
  }

  if (!from && to) {
    for (let j = 1; j <= last; j++) {
      if (has(j, to)) return { board: 0, drop: j };
    }
    return null;
  }

  for (let i = 0; i < last; i++) {
    if (!has(i, from)) continue;
    for (let j = i + 1; j <= last; j++) {
      if (has(j, to)) return { board: i, drop: j };
    }
  }

  return null;
}

// Updates a locally kept occupancy list after someone joins (+1) or leaves (-1)
export function shiftOccupancy(occupancy, board, drop, delta) {
  const next = (occupancy || []).slice();
  for (let s = board; s < drop; s++) {
    next[s] = Math.max((next[s] ?? 0) + delta, 0);
  }
  return next;
}
