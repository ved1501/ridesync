import { Link, useParams, useNavigate } from "react-router-dom";
import UserMenu from "../components/UserMenu";
import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { useRide } from "../context/useRide";
import { authFetch } from "../utils/api";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  CalendarDays,
  Clock3,
  Users,
  Car,
  Star,
  ShieldCheck,
} from "lucide-react";

function RideDetails() {
  const { rideId } = useParams();
  const navigate = useNavigate();

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

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [booking, setBooking] = useState(null);
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  const { user, token } = useAuth();
  const { fetchJoinedRides } = useRide();

  useEffect(() => {
    const fetchRideDetails = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `http://192.168.1.4:5000/api/rides/${rideId}`,
        );

        if (!response.ok) {
          throw new Error("Ride not found");
        }

        const data = await response.json();

        const formattedRide = {
          id: data.id,
          from: data.from_location,
          to: data.to_location,
          date: data.ride_date ? formatRideDate(data.ride_date) : "",
          time: data.departure_time.slice(0, 5),
          vehicle: data.vehicle,
          seatsAvailable: data.seats_available,
          price: data.price,
          status: data.status,

          driver: {
            id: data.driver_id,
            name: data.driver_name,
            email: data.driver_email,
            rating: 5,
          },
        };

        setRide(formattedRide);
      } catch (error) {
        console.error("Error fetching ride:", error);
        setError("Unable to load ride details.");
      } finally {
        setLoading(false);
      }
    };

    fetchRideDetails();
  }, [rideId]);

  useEffect(() => {
    const checkBooking = async () => {
      if (!user?.id || !rideId || !token) return;

      try {
        const response = await authFetch(
          `http://192.168.1.4:5000/api/bookings/user/${user.id}`,
          token,
        );

        if (!response.ok) {
          return;
        }

        const bookings = await response.json();

        const activeBooking = bookings.find(
          (booking) =>
            booking.ride_id === Number(rideId) &&
            booking.status === "Confirmed",
        );

        if (activeBooking) {
          setAlreadyJoined(true);

          setBooking({
            bookingId: activeBooking.booking_code,
            message: "Ride already booked",
          });
        }
      } catch (error) {
        console.error("Error checking booking:", error);
      }
    };

    checkBooking();
  }, [user?.id, rideId, token]);

  const isOwnRide =
    ride?.driver?.email === user?.email || ride?.driver?.name === user?.name;

  const handleJoinRide = async () => {
    if (!user?.id) {
      alert("Please login first");
      return;
    }

    console.log("Booking request:", {
      ride_id: ride.id,
      user,
    });

    try {
      const response = await authFetch(
        "http://192.168.1.4:5000/api/bookings",
        token,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ride_id: ride.id,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      setBooking({
        bookingId: data.booking.booking_code,
        message: data.message,
      });

      setAlreadyJoined(true);

      // Update available seats immediately
      setRide((previousRide) => ({
        ...previousRide,
        seatsAvailable: previousRide.seatsAvailable - 1,
      }));

      // Sync context so My Rides page shows this ride without needing a refresh
      await fetchJoinedRides();
    } catch (error) {
      console.error("Error booking ride:", error);
      alert("Failed to book ride");
    }
  };

  const handleLeaveRide = async () => {
    if (!booking?.bookingId) {
      alert("Booking information not found");
      return;
    }

    try {
      const bookingsResponse = await authFetch(
        `http://192.168.1.4:5000/api/bookings/user/${user.id}`,
        token,
      );

      const bookings = await bookingsResponse.json();

      const activeBooking = bookings.find(
        (item) => item.ride_id === ride.id && item.status === "Confirmed",
      );

      if (!activeBooking) {
        alert("Active booking not found");
        return;
      }

      const response = await authFetch(
        `http://192.168.1.4:5000/api/bookings/${activeBooking.id}/cancel`,
        token,
        {
          method: "PATCH",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      setAlreadyJoined(false);
      setBooking(null);

      setRide((previousRide) => ({
        ...previousRide,
        seatsAvailable: previousRide.seatsAvailable + 1,
      }));

      // Sync context so the Cancelled section on My Rides reflects this immediately
      await fetchJoinedRides();

      alert(data.message);
    } catch (error) {
      console.error("Error leaving ride:", error);
      alert("Failed to leave ride");
    }
  };

  const handleCompleteRide = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to mark this ride as completed?",
    );

    if (!confirmed) return;

    try {
      const response = await authFetch(
        `http://192.168.1.4:5000/api/rides/${ride.id}/complete`,
        token,
        {
          method: "PUT",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to complete ride.");
        return;
      }

      alert(data.message);
      navigate("/my-rides");
    } catch (error) {
      console.error("Error completing ride:", error);
      alert("Unable to connect to server.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading ride details...</p>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-md">
          <div className="text-5xl">🚗</div>

          <h1 className="text-2xl font-bold text-slate-900 mt-5">
            Ride not found
          </h1>

          <p className="text-slate-500 mt-2">
            {error || "The ride you're looking for doesn't exist."}
          </p>

          <Link
            to="/find-ride"
            className="inline-flex items-center gap-2 mt-6 px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            <ArrowLeft size={18} />
            Back to Rides
          </Link>
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-md">
          <div className="text-5xl">🚗</div>

          <h1 className="text-2xl font-bold text-slate-900 mt-5">
            Ride not found
          </h1>

          <p className="text-slate-500 mt-2">
            The ride you're looking for doesn't exist or may have been removed.
          </p>

          <Link
            to="/find-ride"
            className="inline-flex items-center gap-2 mt-6 px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            <ArrowLeft size={18} />
            Back to Rides
          </Link>
        </div>
      </div>
    );
  }

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

            <Link to="/my-rides" className="text-slate-600 hover:text-blue-600">
              My Rides
            </Link>

            <UserMenu />
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-8 py-10">
        {/* Back */}
        <Link
          to="/find-ride"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft size={18} />
          Back to Rides
        </Link>

        {/* Heading */}
        <div className="mt-6">
          <h1 className="text-3xl font-bold text-slate-900">Ride Details</h1>

          <p className="text-slate-600 mt-2">
            {ride.status === "Cancelled"
              ? "This ride has been cancelled."
              : "Review the ride details before joining."}
          </p>
        </div>

        {/* Route Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 mt-8">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            {/* From */}
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <MapPin size={22} className="text-blue-600" />
              </div>

              <div>
                <p className="text-sm text-slate-500">FROM</p>

                <p className="text-xl font-bold text-slate-900">{ride.from}</p>
              </div>
            </div>

            {/* Arrow */}
            <Navigation size={25} className="text-blue-600" />

            {/* To */}
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <MapPin size={22} className="text-green-600" />
              </div>

              <div>
                <p className="text-sm text-slate-500">TO</p>

                <p className="text-xl font-bold text-slate-900">{ride.to}</p>
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div className="border-t border-slate-200 mt-8 pt-6 flex flex-wrap gap-8">
            <div className="flex items-center gap-3">
              <CalendarDays size={20} className="text-blue-600" />

              <div>
                <p className="text-xs text-slate-500">DATE</p>

                <p className="font-semibold text-slate-900">{ride.date}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock3 size={20} className="text-blue-600" />

              <div>
                <p className="text-xs text-slate-500">DEPARTURE</p>

                <p className="font-semibold text-slate-900">{ride.time}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Driver */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-900">Driver</h2>

            <div className="flex items-center gap-4 mt-5">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xl font-bold text-blue-600">
                  {ride.driver.name.charAt(0)}
                </span>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  {ride.driver.name}
                </h3>

                <div className="flex items-center gap-1 mt-1 text-sm text-slate-600">
                  <Star size={15} className="fill-yellow-400 text-yellow-400" />
                  {ride.driver.rating} rating
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-5 text-sm text-green-600">
              <ShieldCheck size={18} />
              Verified Rider
            </div>
          </div>

          {/* Vehicle */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-900">Vehicle</h2>

            <div className="flex items-center gap-4 mt-5">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
                <Car size={28} className="text-blue-600" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">{ride.vehicle}</h3>

                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                  <Users size={16} />
                  {ride.seatsAvailable} seats available
                </div>
              </div>
            </div>
          </div>
        </div>

        {booking && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-bold">✓</span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-green-800">
                  Ride Joined Successfully!
                </h3>

                <p className="text-sm text-green-700 mt-1">
                  Your seat has been confirmed.
                </p>

                <div className="mt-4">
                  <p className="text-xs text-green-600 font-medium">
                    BOOKING ID
                  </p>

                  <p className="text-lg font-bold text-green-900">
                    {booking.bookingId}
                  </p>
                </div>

                <p className="text-xs text-green-600 mt-3">Status: Confirmed</p>
              </div>
            </div>
          </div>
        )}

        {/* Join Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm text-slate-500">Contribution per seat</p>

              <p className="text-3xl font-bold text-slate-900 mt-1">
                ₹{ride.price}
              </p>

              <p className="text-sm text-slate-500 mt-1">
                {ride.seatsAvailable} seats currently available
              </p>
            </div>
            {ride.status === "Cancelled" ? (
              <div className="px-8 py-4 bg-red-100 text-red-700 rounded-lg font-semibold">
                Ride Cancelled
              </div>
            ) : isOwnRide ? (
              <div className="flex items-center gap-3">
                <Link
                  to={`/edit-ride/${ride.id}`}
                  className="px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Edit Ride
                </Link>

                <button
                  onClick={handleCompleteRide}
                  className="px-6 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                >
                  Complete Ride
                </button>

                <button
                  onClick={async () => {
                    const confirmed = window.confirm(
                      "Are you sure you want to cancel this ride?",
                    );

                    if (!confirmed) {
                      return;
                    }

                    try {
                      const response = await authFetch(
                        `http://192.168.1.4:5000/api/rides/${ride.id}/cancel`,
                        token,
                        {
                          method: "PUT",
                        },
                      );

                      const data = await response.json();

                      if (!response.ok) {
                        alert(data.message || "Failed to cancel ride.");
                        return;
                      }

                      alert(data.message);
                      window.location.reload();
                    } catch (error) {
                      console.error("Error cancelling ride:", error);
                      alert("Unable to connect to server.");
                    }
                  }}
                  className="px-6 py-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                >
                  Cancel Ride
                </button>
              </div>
            ) : alreadyJoined || booking ? (
              <button
                onClick={handleLeaveRide}
                className="px-6 py-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
              >
                Leave Ride
              </button>
            ) : (
              <button
                onClick={handleJoinRide}
                disabled={ride.seatsAvailable <= 0}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {ride.seatsAvailable > 0 ? "Join Ride" : "No Seats Available"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default RideDetails;
