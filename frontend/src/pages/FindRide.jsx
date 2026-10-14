import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
// import { useRide } from "../context/useRide";
import { useAuth } from "../context/useAuth";
// import UserMenu from "../components/UserMenu";

import {
  ArrowLeft,
  Search,
  MapPin,
  Navigation,
  CalendarDays,
  Clock3,
  Users,
  Car,
  Route as RouteIcon,
} from "lucide-react";
import Navbar from "../components/Navbar";
import RideRouteMap from "../components/RideRouteMap";
import {
  buildPoints,
  fareBetween,
  matchStops,
  seatsBetween,
} from "../utils/stops";

function FindRide() {
  // const { rides, getRideStatus } = useRide();
  const { user } = useAuth();

  const formatRideDate = (date) => {
    if (!date) return "";

    const [year, month, day] = date.slice(0, 10).split("-");

    const formattedDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    );

    return formattedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [openRouteId, setOpenRouteId] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    const fetchRides = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("http://192.168.31.200:5000/api/rides");

        if (!response.ok) {
          throw new Error("Failed to fetch rides");
        }

        const data = await response.json();

        const formattedRides = data.map((ride) => ({
          id: ride.id,
          from: ride.from_location,
          to: ride.to_location,
          date: ride.ride_date ? ride.ride_date.slice(0, 10) : "",
          time: ride.departure_time.slice(0, 5),
          vehicle: ride.vehicle,
          seatsAvailable: ride.seats_available,
          price: ride.price,
          status: ride.status,

          // stops along the way + how many seats are taken on each part
          stops: (ride.stops || []).map((stop) => ({
            location: stop.location,
            fare: Number(stop.fare),
          })),
          occupancy: ride.occupancy || [],
          capacity: ride.capacity ?? ride.seats_available,

          driver: {
            id: ride.driver_id,
            name: ride.driver_name,
            email: ride.driver_email,
            rating: 5,
          },
        }));

        setRides(formattedRides);
      } catch (error) {
        console.error("Error fetching rides:", error);
        setError("Unable to load rides.");
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
  };

  const filteredRides = rides
    .map((ride) => ({ ...ride, trip: matchStops(ride, from, to) }))
    .filter((ride) => {
    const rideDateTime = new Date(`${ride.date}T${ride.time}`);
    const now = new Date();

    const isUpcoming = ride.status === "Active" && rideDateTime > now;

    const isOwnRide = Number(ride.driver?.id) === Number(user?.id);

    // Matches the start, the destination or any stop, in travel order
    const matchesRoute = ride.trip !== null;

    const tripSeats = ride.trip
      ? seatsBetween(ride, ride.trip.board, ride.trip.drop)
      : 0;

    const matchesDate = !date || ride.date === date;

    const matchesTime = !time || ride.time >= time;

    return (
      isUpcoming &&
      tripSeats > 0 &&
      !isOwnRide &&
      matchesRoute &&
      matchesDate &&
      matchesTime
    );
  });

  return (
    <div className="relative z-10 min-h-screen">
      {/* Navbar */}

      <Navbar />
      {/* <nav className="glass-crystal backdrop-blur-md sticky top-0 z-20 rounded-none border-x-0 border-t-0">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
         <Link to="/dashboard" className="flex flex-col items-center text-center">
            <span className="text-2xl font-bold text-blue-600 font-display">
              Ride<span className="text-green-600">Sync</span>
            </span>

            <span className="text-xs font-medium text-slate-600">
              Sync your ride, with RideSync.
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className="text-slate-600 hover:text-blue-600"
            >
              Dashboard
            </Link>

            <Link to="/my-rides" className="text-slate-600 hover:text-blue-600">
              My Rides
            </Link>

            <UserMenu />
          </div>
        </div>
      </nav> */}

      {/* Main */}
      <main className="max-w-6xl mx-auto px-8 py-10 pb-32 md:pb-10">
        <div className="glass-crystal rounded-3xl p-8 md:p-10">
          {/* Back */}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-slate-200 hover:text-blue-600"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>

          {/* Heading */}
          <div className="mt-6">
            <h1 className="text-3xl font-bold text-slate-900">Find a Ride</h1>

            <p className="mt-2 text-slate-200">
              Find someone travelling along your route.
            </p>
          </div>

          {/* Search Box */}
          <form
            onSubmit={handleSearch}
            className="glass-crystal group bg-slate-300 border border-slate-100 rounded-2xl p-6 mt-8 shadow-sm"
          >
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* From */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <MapPin size={16} className="text-blue-600" />
                  From
                </label>

                <input
                  type="text"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  placeholder="e.g. Gondia"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* To */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Navigation size={16} className="text-blue-600" />
                  To
                </label>

                <input
                  type="text"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  placeholder="e.g. Gondia MIDC"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <CalendarDays size={16} className="text-blue-600" />
                  Date
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Time */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Clock3 size={16} className="text-blue-600" />
                  Time
                </label>

                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              <Search size={18} />
              Search Rides
            </button>
          </form>

          {/* Results */}
          {loading && (
            <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center">
              <p className="text-slate-500">Loading rides...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          <section className="mt-10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Available Rides
                </h2>

                <p className="text-sm text-slate-200 mt-1">
                  {filteredRides.length}{" "}
                  {filteredRides.length === 1 ? "ride" : "rides"} found for your
                  route
                </p>
              </div>
            </div>

            {/* Ride Cards */}
            <div className="space-y-4">
              {filteredRides.length > 0 ? (
                filteredRides.map((ride) => (
                  <div
                    key={ride.id}
                    className=" group bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all animate-fade-in-up"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      {/* Driver */}
                      <div className="flex items-center gap-4 min-w-[220px]">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-lg font-bold text-blue-600">
                            {ride.driver.name.charAt(0)}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {ride.driver.name}
                          </h3>

                          <p className="text-sm text-slate-500">
                            ⭐ {ride.driver.rating}
                          </p>
                        </div>
                      </div>

                      {/* Route (the part of the journey that matches the search) */}
                      <div>
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-sm text-slate-500">From</p>

                            <p className="font-semibold text-slate-900">
                              {buildPoints(ride)[ride.trip.board].location}
                            </p>
                          </div>

                          <div className="w-12">
                            <Navigation
                              size={16}
                              className="text-blue-600 ml-5"
                            />
                          </div>

                          <div>
                            <p className="text-sm text-slate-500">To</p>

                            <p className="font-semibold text-slate-900">
                              {buildPoints(ride)[ride.trip.drop].location}
                            </p>
                          </div>
                        </div>

                        {ride.stops.length > 0 && (
                          <p className="text-xs text-slate-500 mt-2 max-w-xs">
                            Ride goes {ride.from.split(",")[0]} →{" "}
                            {ride.stops
                              .map((stop) => stop.location.split(",")[0])
                              .join(" → ")}{" "}
                            → {ride.to.split(",")[0]}
                          </p>
                        )}
                      </div>

                      {/* Date / Time */}
                      <div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <CalendarDays size={17} />
                          <span>{formatRideDate(ride.date)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500 mt-2">
                          <Clock3 size={17} />
                          <span>{ride.time}</span>
                        </div>
                      </div>

                      {/* Vehicle */}
                      <div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <Car size={18} />
                          <span>{ride.vehicle}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500 mt-2">
                          <Users size={17} />
                          <span>
                            {seatsBetween(ride, ride.trip.board, ride.trip.drop)}{" "}
                            seats available
                          </span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">
                          ₹{fareBetween(ride, ride.trip.board, ride.trip.drop)}
                        </p>

                        <p className="text-xs text-slate-500">per seat</p>

                        <Link
                          to={`/ride/${ride.id}?board=${ride.trip.board}&drop=${ride.trip.drop}`}
                          className="inline-block mt-3 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                          View Ride
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            setOpenRouteId(
                              openRouteId === ride.id ? null : ride.id,
                            )
                          }
                          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50"
                        >
                          <RouteIcon size={15} />
                          {openRouteId === ride.id ? "Hide route" : "View route"}
                        </button>
                      </div>
                    </div>

                    {openRouteId === ride.id && (
                      <div className="mt-5">
                        <RideRouteMap
                          from={ride.from}
                          to={ride.to}
                          stops={ride.stops.map((stop) => stop.location)}
                          height={280}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center">
                  <div className="text-4xl">🚗</div>

                  <h3 className="text-lg font-semibold text-slate-900 mt-4">
                    No rides found
                  </h3>

                  <p className="text-slate-500 mt-2">
                    Try changing your location, date, or time.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default FindRide;
