// ============================================================
// Helpers for rides with intermediate stops.
//
// A ride has points:  0 = start, 1..n = stops, n+1 = destination.
// Segment s is the road between point s and point s+1  (s = 0..n).
// A booking from point `board` to point `drop` occupies one seat on
// segments board .. drop-1. A seat is free again after the passenger
// gets off.
// ============================================================

// How many seats are taken on each segment
export function buildOccupancy(stopsCount, bookings) {
  const segmentCount = stopsCount + 1;
  const occupancy = new Array(segmentCount).fill(0);

  for (const booking of bookings) {
    const from = booking.board_index ?? 0;
    const to = booking.drop_index ?? segmentCount; // NULL = whole route

    for (let s = from; s < to && s < segmentCount; s++) {
      if (s >= 0) occupancy[s] += 1;
    }
  }

  return occupancy;
}

// Largest value of arr[from .. to-1] (0 for an empty range)
export function maxIn(arr, from = 0, to = arr.length) {
  let max = 0;
  for (let i = from; i < to; i++) {
    if (arr[i] > max) max = arr[i];
  }
  return max;
}

// Price from the start up to a point
export function fareAt(index, stops, fullPrice) {
  if (index <= 0) return 0;
  if (index > stops.length) return Number(fullPrice);
  return Number(stops[index - 1].fare_from_start);
}

// Loads stops + confirmed bookings and works out the occupancy.
// `db` can be the pool or a transaction client.
export async function getRideSegments(db, rideId) {
  const stopsResult = await db.query(
    `
    SELECT stop_order, location, fare_from_start
    FROM ride_stops
    WHERE ride_id = $1
    ORDER BY stop_order
    `,
    [rideId],
  );

  const bookingsResult = await db.query(
    `
    SELECT board_index, drop_index
    FROM bookings
    WHERE ride_id = $1
      AND status = 'Confirmed'
    `,
    [rideId],
  );

  const stops = stopsResult.rows;
  const occupancy = buildOccupancy(stops.length, bookingsResult.rows);

  return {
    stops,
    occupancy,
    maxOccupancy: maxIn(occupancy),
    bookingCount: bookingsResult.rows.length,
  };
}

// Checks the stops sent by the app. Returns { error } or { stops }.
export function validateStops(rawStops, fullPrice, fromLocation, toLocation) {
  if (rawStops === undefined || rawStops === null) return { stops: [] };

  if (!Array.isArray(rawStops)) {
    return { error: "Stops must be a list." };
  }

  if (rawStops.length > 8) {
    return { error: "You can add at most 8 stops." };
  }

  const seen = new Set([
    String(fromLocation).trim().toLowerCase(),
    String(toLocation).trim().toLowerCase(),
  ]);

  const clean = [];
  let previousFare = 0;

  for (let i = 0; i < rawStops.length; i++) {
    const location = String(rawStops[i]?.location ?? "").trim();
    const fare = Number(rawStops[i]?.fare);

    if (!location) {
      return { error: `Stop ${i + 1} needs a location.` };
    }

    if (location.length > 255) {
      return { error: `Stop ${i + 1} location is too long.` };
    }

    if (seen.has(location.toLowerCase())) {
      return {
        error: `Stop ${i + 1} (${location}) is already used in this route.`,
      };
    }
    seen.add(location.toLowerCase());

    if (!Number.isFinite(fare) || fare < 0) {
      return { error: `Stop ${i + 1} needs a valid price.` };
    }

    if (fare < previousFare) {
      return {
        error: `Stop ${i + 1} price cannot be lower than the previous stop.`,
      };
    }

    if (fare > Number(fullPrice)) {
      return {
        error: `Stop ${i + 1} price cannot be more than the full ride price.`,
      };
    }

    previousFare = fare;
    clean.push({ location, fare });
  }

  return { stops: clean };
}

// Replaces all stops of a ride (use inside a transaction)
export async function replaceRideStops(client, rideId, stops) {
  await client.query("DELETE FROM ride_stops WHERE ride_id = $1", [rideId]);

  for (let i = 0; i < stops.length; i++) {
    await client.query(
      `
      INSERT INTO ride_stops (ride_id, stop_order, location, fare_from_start)
      VALUES ($1, $2, $3, $4)
      `,
      [rideId, i + 1, stops[i].location, stops[i].fare],
    );
  }
}
