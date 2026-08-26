import { Link } from "react-router-dom";
import { useRide } from "../context/useRide";
import { useAuth } from "../context/useAuth";
import UserMenu from "../components/UserMenu";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  CalendarDays,
  Clock3,
  Users,
  Car,
} from "lucide-react";

function MyRides() {
  const { rides, joinedRides, leaveRide, deleteRide, getRideStatus } =
    useRide();
  const { user } = useAuth();

  console.log("Current User:", user);
  console.log("All Rides:", rides);
  console.log("Joined Rides:", joinedRides);

  const offeredRides = rides
    .filter((ride) => Number(ride.driver_id) === Number(user.id))
    .map((ride) => ({
      ...ride,
      from: ride.from_location,
      to: ride.to_location,
      date: ride.ride_date,
      time: ride.departure_time?.slice(0, 5),
      seatsAvailable: ride.seats_available,
    }));

  console.log("Current User:", user);
  console.log("All Rides:", rides);
  console.log(
    "Ride Driver IDs:",
    rides.map((ride) => ({
      rideId: ride.id,
      driverId: ride.driver?.id,
      driver: ride.driver,
    })),
  );

  const upcomingOfferedRides = offeredRides.filter(
    (ride) => getRideStatus(ride) === "Active",
  );

  const completedOfferedRides = offeredRides.filter(
    (ride) => getRideStatus(ride) === "Completed",
  );

  const cancelledOfferedRides = offeredRides.filter(
    (ride) => ride.status === "Cancelled",
  );

  const upcomingJoinedRides = joinedRides.filter(
    (ride) => getRideStatus(ride) === "Active",
  );

  const completedJoinedRides = joinedRides.filter(
    (ride) => getRideStatus(ride) === "Completed",
  );

  const cancelledJoinedRides = joinedRides.filter(
    (ride) => ride.bookingStatus === "Cancelled",
  );

  const completedRides = [
    ...completedOfferedRides.map((ride) => ({
      ...ride,
      rideType: "offered",
    })),
    ...completedJoinedRides.map((ride) => ({
      ...ride,
      rideType: "joined",
    })),
  ];

  const cancelledRides = [
    ...cancelledOfferedRides.map((ride) => ({
      ...ride,
      rideType: "offered",
    })),
    ...cancelledJoinedRides.map((ride) => ({
      ...ride,
      rideType: "joined",
    })),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-2xl font-bold text-blue-600">
            RideSync
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className="text-slate-600 hover:text-blue-600"
            >
              Dashboard
            </Link>

            <Link to="/my-rides" className="text-blue-600 font-medium">
              My Rides
            </Link>

            <UserMenu />
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-8 py-10">
        {/* Back */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>

        {/* Heading */}
        <div className="mt-6">
          <h1 className="text-3xl font-bold text-slate-900">My Rides</h1>

          <p className="mt-2 text-slate-600">
            Manage the rides you offer and the rides you join.
          </p>
        </div>

        {/* Offered Rides */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Offered Rides
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Rides you're offering to other commuters.
              </p>
            </div>

            <Link
              to="/offer-ride"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Offer New Ride
            </Link>
          </div>

          <div className="space-y-4">
            {upcomingOfferedRides.map((ride) => (
              <div
                key={ride.id}
                className="bg-white border border-slate-200 rounded-2xl p-6"
              >
                {/* Route */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <MapPin size={19} className="text-blue-600" />
                      </div>

                      <div className="w-px h-7 bg-slate-300" />

                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <MapPin size={19} className="text-green-600" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-slate-500">FROM</p>

                        <p className="font-semibold text-slate-900">
                          {ride.from_location}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">TO</p>

                        <p className="font-semibold text-slate-900">
                          {ride.to_location}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <CalendarDays size={17} />
                      {new Date(ride.ride_date).toLocaleDateString("en-IN")}
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 mt-2">
                      <Clock3 size={17} />
                      {ride.departure_time?.slice(0, 5)}
                    </div>
                  </div>

                  {/* Vehicle */}
                  <div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Car size={18} />
                      {ride.vehicle}
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 mt-2">
                      <Users size={17} />
                      {ride.seats_available} seats available
                    </div>
                  </div>

                  {/* Price / Status */}
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">
                      ₹{ride.price}
                    </p>

                    <p className="text-xs text-slate-500">per seat</p>

                    <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      {ride.status}
                    </span>
                  </div>

                  {/* View */}
                  <div className="flex flex-col gap-2">
                    <Link
                      to={`/ride/${ride.id}`}
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 text-center"
                    >
                      View Ride
                    </Link>

                    <Link
                      to={`/edit-ride/${ride.id}`}
                      className="px-5 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 text-center"
                    >
                      Edit Ride
                    </Link>

                    <button
                      onClick={async () => {
                        const confirmDelete = window.confirm(
                          "Are you sure you want to delete this ride?",
                        );

                        if (confirmDelete) {
                          const result = await deleteRide(ride.id);
                          alert(result.message);
                        }
                      }}
                      className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                    >
                      Delete Ride
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Joined Rides */}
        <section className="mt-12">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Joined Rides</h2>

            <p className="text-sm text-slate-500 mt-1">
              Rides you've joined as a passenger.
            </p>
          </div>

          <div className="space-y-4">
            {upcomingJoinedRides.map((ride) => (
              <div
                key={ride.id}
                className="bg-white border border-slate-200 rounded-2xl p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Driver */}
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="font-bold text-blue-600">
                        {ride.driver.name.charAt(0)}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">DRIVER</p>

                      <p className="font-semibold text-slate-900">
                        {ride.driver.name}
                      </p>
                    </div>
                  </div>

                  {/* Route */}
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900">
                      {ride.from}
                    </span>

                    <Navigation size={17} className="text-blue-600" />

                    <span className="font-semibold text-slate-900">
                      {ride.to}
                    </span>
                  </div>

                  {/* Date */}
                  <div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <CalendarDays size={17} />
                      {ride.date}
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 mt-2">
                      <Clock3 size={17} />
                      {ride.time}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      {ride.bookingStatus || ride.status}
                    </span>

                    <p className="text-sm text-slate-500 mt-2">
                      ₹{ride.price} / seat
                    </p>

                    {ride.bookingId && (
                      <div className="mt-3">
                        <p className="text-xs text-slate-500">BOOKING ID</p>

                        <p className="text-sm font-semibold text-slate-900 mt-1">
                          {ride.bookingId}
                        </p>
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/ride/${ride.id}`}
                    className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 text-center"
                  >
                    View Ride
                  </Link>

                  <button
                    onClick={async () => {
                      const result = await leaveRide(ride.bookingId);
                      alert(result.message);
                    }}
                    className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    Leave Ride
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        {/* Completed Rides */}
        <section className="mt-12">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Completed Rides
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Your completed journeys and past rides.
            </p>
          </div>

          {completedRides.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <p className="text-slate-500">No completed rides yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedRides.map((ride) => (
                <div
                  key={`${ride.rideType}-${ride.id}`}
                  className="bg-white border border-slate-200 rounded-2xl p-6"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    {/* Route */}
                    <div>
                      <p className="text-xs text-slate-500">
                        {ride.rideType === "offered"
                          ? "OFFERED RIDE"
                          : "JOINED RIDE"}
                      </p>

                      <div className="flex items-center gap-3 mt-2">
                        <span className="font-semibold text-slate-900">
                          {ride.from}
                        </span>

                        <Navigation size={17} className="text-slate-400" />

                        <span className="font-semibold text-slate-900">
                          {ride.to}
                        </span>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <CalendarDays size={17} />
                        {ride.date}
                      </div>

                      <div className="flex items-center gap-2 text-slate-500 mt-2">
                        <Clock3 size={17} />
                        {ride.time}
                      </div>
                    </div>

                    {/* Driver */}
                    <div>
                      <p className="text-xs text-slate-500">DRIVER</p>

                      <p className="font-semibold text-slate-900 mt-1">
                        {ride.driver?.name}
                      </p>
                    </div>

                    {/* Status / Booking */}
                    <div>
                      <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                        Cancelled
                      </span>

                      <p className="text-sm text-slate-500 mt-2">
                        ₹{ride.price} / seat
                      </p>

                      {ride.bookingId && (
                        <p className="text-xs text-slate-500 mt-1">
                          Booking: {ride.bookingId}
                        </p>
                      )}
                    </div>

                    {/* View */}
                    <Link
                      to={`/ride/${ride.id}`}
                      className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 text-center"
                    >
                      View Ride
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Cancelled Rides */}
        <section className="mt-12">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Cancelled Rides
            </h2>

            <p className="text-sm text-slate-500 mt-1">Rides you cancelled.</p>
          </div>

          {cancelledRides.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <p className="text-slate-500">No cancelled rides.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cancelledRides.map((ride) => {
                console.log("Cancelled Ride:", ride);

                return (
                  <div
                    key={ride.id}
                    className="bg-white border border-red-200 rounded-2xl p-6"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      {/* Route */}
                      <div>
                        <p className="text-xs text-red-500 font-medium">
                          {ride.rideType === "offered"
                            ? "YOUR RIDE — CANCELLED"
                            : "JOINED RIDE — CANCELLED"}
                        </p>

                        <div className="flex items-center gap-3 mt-2">
                          <span className="font-semibold text-slate-900">
                            {ride.from}
                          </span>

                          <Navigation size={17} className="text-slate-400" />

                          <span className="font-semibold text-slate-900">
                            {ride.to}
                          </span>
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <CalendarDays size={17} />
                          {ride.date}
                          <Clock3 size={17} />
                          {ride.time}
                        </div>
                      </div>

                      {/* Vehicle */}
                      <div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <Car size={18} />
                          {ride.vehicle}
                        </div>

                        <div className="flex items-center gap-2 text-slate-500 mt-2">
                          <Users size={17} />
                          {ride.seatsAvailable} seats
                        </div>
                      </div>

                      {/* Price / Status */}
                      <div>
                        <p className="text-xl font-bold text-slate-900">
                          ₹{ride.price}
                        </p>

                        <p className="text-xs text-slate-500">per seat</p>

                        <span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          Cancelled
                        </span>
                      </div>

                      {/* View */}
                      <Link
                        to={`/ride/${ride.id}`}
                        className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 text-center"
                      >
                        View Ride
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default MyRides;
