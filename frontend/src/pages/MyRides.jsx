import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useRide } from "../context/useRide";
import { useAuth } from "../context/useAuth";
// import UserMenu from "../components/UserMenu";
import {
  MapPin,
  Navigation,
  CalendarDays,
  Clock3,
  Users,
  Car,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Navbar from "../components/Navbar";

function CancelledChatButton({ ride }) {
  const [chatAvailable, setChatAvailable] = useState(false);

  const driverId = ride.driver?.id || ride.driver_id;

  useEffect(() => {
    let timer;

    const checkChatStatus = async () => {
      if (!ride?.id || !ride?.bookingId || !driverId) {
        setChatAvailable(false);
        return;
      }

      try {
        const token = localStorage.getItem("authToken");

        const response = await fetch(
          `http://192.168.31.200:5000/api/messages/status/${ride.id}?receiver=${driverId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          setChatAvailable(false);
          return;
        }

        const data = await response.json();

        if (!data.chatAvailable) {
          setChatAvailable(false);
          return;
        }

        setChatAvailable(true);

        if (data.chatAvailableUntil) {
          const remainingTime =
            new Date(data.chatAvailableUntil).getTime() - Date.now();

          if (remainingTime <= 0) {
            setChatAvailable(false);
            return;
          }

          timer = setTimeout(() => {
            setChatAvailable(false);
          }, remainingTime);
        }
      } catch (error) {
        console.error("Error checking cancelled ride chat status:", error);
        setChatAvailable(false);
      }
    };

    checkChatStatus();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [ride?.id, ride?.bookingId, driverId]);

  if (!chatAvailable) {
    return null;
  }

  return (
    <Link
      to={`/chat/${ride.id}?receiver=${driverId}`}
      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
    >
      <MessageCircle size={17} />
      Chat
    </Link>
  );
}

function MyRides() {
  const { rides, joinedRides, getRideStatus } = useRide();
  const { user } = useAuth();

  const [openSections, setOpenSections] = useState({
    offered: false,
    joined: false,
    expired: false,
    completed: false,
    cancelled: false,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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

  const upcomingOfferedRides = offeredRides.filter((ride) =>
    ["Active", "In Progress"].includes(getRideStatus(ride)),
  );

  const completedOfferedRides = offeredRides.filter(
    (ride) => getRideStatus(ride) === "Completed",
  );

  const expiredOfferedRides = offeredRides.filter(
    (ride) => getRideStatus(ride) === "Expired",
  );

  const cancelledOfferedRides = offeredRides.filter(
    (ride) => ride.status === "Cancelled",
  );

  const upcomingJoinedRides = joinedRides.filter(
    (ride) =>
      ride.bookingStatus === "Confirmed" &&
      ["Active", "In Progress"].includes(getRideStatus(ride)),
  );

  const completedJoinedRides = joinedRides.filter(
    (ride) =>
      ride.bookingStatus === "Confirmed" && getRideStatus(ride) === "Completed",
  );

  const expiredJoinedRides = joinedRides.filter(
    (ride) =>
      ride.bookingStatus === "Confirmed" && getRideStatus(ride) === "Expired",
  );

  const cancelledJoinedRides = joinedRides.filter(
    (ride) => ride.bookingStatus === "Cancelled" || ride.status === "Cancelled",
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
    <div className="relative z-10 min-h-screen">
      {/* Navbar */}
      <Navbar showMyRides={false} />
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

            <Link to="/my-rides" className="text-blue-600 font-medium">
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
          {/* <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-slate-300 hover:text-blue-600"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link> */}

          {/* Heading */}
          <div className="mt-6">
            <h1 className="text-3xl font-bold text-slate-900">My Rides</h1>

            <p className="mt-2 text-slate-300">
              Manage the rides you offer and the rides you join.
            </p>
          </div>

          {/* Offered Rides */}
          <section className="mt-10">
            <div className="mb-5">
              <button
                type="button"
                onClick={() => toggleSection("offered")}
                className="w-full flex items-center justify-between text-left group"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-green-600">
                      Offered Rides
                    </h2>

                    <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      {upcomingOfferedRides.length}
                    </span>
                  </div>

                  <p className="text-sm text-slate-100 mt-1">
                    Rides you're offering to other commuters.
                  </p>
                </div>

                <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-100 transition-colors">
                  {openSections.offered ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </button>
            </div>

            {openSections.offered && (
              <>
                {upcomingOfferedRides.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
                    <p className="text-slate-500">No offered rides.</p>
                  </div>
                ) : null}

                <div className="space-y-4">
                  {upcomingOfferedRides.map((ride) => (
                    <div
                      key={ride.id}
                      className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-md transition-shadow animate-fade-in-up"
                    >
                      {/* Route */}
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex items-center gap-5">
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <MapPin size={19} className="text-blue-600" />
                            </div>

                            <div className="relative w-px h-7 border-l-2 border-dashed border-slate-300">
                              <span className="route-dot-y absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent-500" />
                            </div>

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
                            {new Date(ride.ride_date).toLocaleDateString(
                              "en-IN",
                            )}
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

                        {/* Actions */}
                        <div className="flex flex-col gap-2 min-w-[120px]">
                          {ride.rideType === "joined" && (
                            <CancelledChatButton ride={ride} />
                          )}

                          <Link
                            to={`/ride/${ride.id}`}
                            className="px-5 py-2 border bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-white hover:text-red-500 text-center"
                          >
                            View Ride
                          </Link>
                        </div>

                        {/* <Link
                      to={`/edit-ride/${ride.id}`}
                      className="px-5 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 text-center"
                    >
                      Edit Ride
                    </Link> */}

                        {/* <button
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
                    </button> */}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Joined Rides */}
          <section className="mt-12">
            <div className="mb-5">
              <button
                type="button"
                onClick={() => toggleSection("joined")}
                className="w-full flex items-center justify-between text-left group"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-yellow-600">
                      Joined Rides
                    </h2>

                    <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                      {upcomingJoinedRides.length}
                    </span>
                  </div>

                  <p className="text-sm text-slate-100 mt-1">
                    Rides you've joined as a passenger.
                  </p>
                </div>

                <div className="w-9 h-9 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 group-hover:bg-yellow-100 transition-colors">
                  {openSections.joined ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </button>
            </div>

            {openSections.joined && (
              <>
                {upcomingJoinedRides.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
                    <p className="text-slate-500">No joined rides.</p>
                  </div>
                ) : null}

                <div className="space-y-4">
                  {upcomingJoinedRides.map((ride) => (
                    <div
                      key={ride.id}
                      className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-md transition-shadow animate-fade-in-up"
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
                              <p className="text-xs text-slate-500">
                                BOOKING ID
                              </p>

                              <p className="text-sm font-semibold text-slate-900 mt-1">
                                {ride.bookingId}
                              </p>
                            </div>
                          )}
                        </div>

                        <Link
                          to={`/ride/${ride.id}`}
                          className="px-5 py-2 bg-green-600 border text-white rounded-lg text-sm font-medium hover:bg-white hover:text-green-600 text-center"
                        >
                          View Ride
                        </Link>

                        {/* <button
                    onClick={async () => {
                      const result = await leaveRide(ride.bookingId);
                      alert(result.message);
                    }}
                    className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    Leave Ride
                  </button> */}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Expired Rides */}

          <section className="mt-12">
            <div className="mb-5">
              <button
                type="button"
                onClick={() => toggleSection("expired")}
                className="w-full flex items-center justify-between text-left group"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-red-600">
                      Expired Rides
                    </h2>

                    <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                      {expiredOfferedRides.length + expiredJoinedRides.length}
                    </span>
                  </div>

                  <p className="text-sm text-slate-100 mt-1">
                    Rides whose scheduled time has passed without starting.
                  </p>
                </div>

                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-100 transition-colors">
                  {openSections.expired ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </button>
            </div>

            {openSections.expired && (
              <>
                {expiredOfferedRides.length === 0 &&
                expiredJoinedRides.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
                    <p className="text-slate-500">No expired rides.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {expiredOfferedRides.map((ride) => (
                      <div
                        key={`offered-expired-${ride.id}`}
                        className="bg-white border border-red-200 rounded-2xl p-6"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                          {/* Route */}
                          <div>
                            <p className="text-xs text-red-500 font-medium">
                              OFFERED RIDE
                            </p>

                            <div className="flex items-center gap-3 mt-2">
                              <span className="font-semibold text-slate-900">
                                {ride.from}
                              </span>

                              <Navigation
                                size={17}
                                className="text-slate-400"
                              />

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

                          {/* Status */}
                          <div>
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                              Expired
                            </span>

                            <p className="text-sm text-slate-500 mt-2">
                              ₹{ride.price} / seat
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            <Link
                              to={`/ride/${ride.id}`}
                              className="px-5 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 text-center"
                            >
                              View Ride
                            </Link>

                            <Link
                              to={`/edit-ride/${ride.id}?reschedule=true`}
                              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 text-center"
                            >
                              Reschedule Ride
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}

                    {expiredJoinedRides.map((ride) => (
                      <div
                        key={`joined-expired-${ride.id}`}
                        className="bg-white border border-red-200 rounded-2xl p-6"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                          {/* Driver */}
                          <div className="flex items-center gap-4 min-w-[200px]">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="font-bold text-blue-600">
                                {ride.driver?.name?.charAt(0) || "?"}
                              </span>
                            </div>

                            <div>
                              <p className="text-xs text-slate-500">DRIVER</p>

                              <p className="font-semibold text-slate-900">
                                {ride.driver?.name || "Unknown Driver"}
                              </p>
                            </div>
                          </div>

                          {/* Route */}
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-900">
                              {ride.from}
                            </span>

                            <Navigation size={17} className="text-slate-400" />

                            <span className="font-semibold text-slate-900">
                              {ride.to}
                            </span>
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

                          {/* Status */}
                          <div>
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                              Expired
                            </span>

                            <p className="text-sm text-slate-500 mt-2">
                              ₹{ride.price} / seat
                            </p>
                          </div>

                          {/* Actions */}
                          <div>
                            <Link
                              to={`/ride/${ride.id}`}
                              className="px-5 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 text-center"
                            >
                              View Ride
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Completed Rides */}
          <section className="mt-12">
            <div className="mb-5">
              <button
                type="button"
                onClick={() => toggleSection("completed")}
                className="w-full flex items-center justify-between text-left group"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-blue-700">
                      Completed Rides
                    </h2>

                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {completedRides.length}
                    </span>
                  </div>

                  <p className="text-sm text-slate-100 mt-1">
                    Your completed journeys and past rides.
                  </p>
                </div>

                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                  {openSections.completed ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </button>
            </div>

            {openSections.completed && (
              <>
                {completedRides.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
                    <p className="text-slate-500">No completed rides.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedRides.map((ride) => (
                      <div
                        key={`${ride.rideType}-${ride.id}`}
                        className="bg-white border border-slate-100 rounded-2xl p-6"
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

                              <Navigation
                                size={17}
                                className="text-slate-400"
                              />

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
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              Completed
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
                            className="px-5 py-2 border bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-white hover:text-blue-600 text-center"
                          >
                            View Ride
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Cancelled Rides */}
          <section className="mt-12">
            <div className="mb-5">
              <button
                type="button"
                onClick={() => toggleSection("cancelled")}
                className="w-full flex items-center justify-between text-left group"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-red-800">
                      Cancelled Rides
                    </h2>

                    <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                      {cancelledRides.length}
                    </span>
                  </div>

                  <p className="text-sm text-slate-100 mt-1">
                    Rides that were cancelled.
                  </p>
                </div>

                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-100 transition-colors">
                  {openSections.cancelled ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </div>
              </button>
            </div>

            {openSections.cancelled && (
              <>
                {cancelledRides.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
                    <p className="text-slate-500">No cancelled rides.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cancelledRides.map((ride) => {
                      console.log("Cancelled Ride:", ride);

                      return (
                        <div
                          key={`${ride.rideType}-${ride.id}`}
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

                                <Navigation
                                  size={17}
                                  className="text-slate-400"
                                />

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

                            {/* Actions */}
                            <div className="flex flex-col gap-2 min-w-[120px]">
                              {/* Chat only for joined/cancelled passenger rides */}
                              {ride.rideType === "joined" && (
                                <CancelledChatButton ride={ride} />
                              )}

                              <Link
                                to={`/ride/${ride.id}`}
                                className="px-5 py-2 border bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-white hover:text-red-500 text-center"
                              >
                                View Ride
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default MyRides;
