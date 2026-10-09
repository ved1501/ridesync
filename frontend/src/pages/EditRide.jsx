import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  CalendarDays,
  Clock3,
  Users,
  Car,
  IndianRupee,
} from "lucide-react";
import { useRide } from "../context/useRide";
import Navbar from "../components/Navbar";
import PlaceInput from "../components/PlaceInput";

function EditRide() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { rides, updateRide, rescheduleRide } = useRide();

  const [searchParams] = useSearchParams();
  const isReschedule = searchParams.get("reschedule") === "true";

  const ride = rides.find((ride) => ride.id === Number(rideId));

  const [formData, setFormData] = useState({
    from: undefined,
    to: undefined,
    date: undefined,
    time: undefined,
    seats: undefined,
    vehicle: undefined,
    price: undefined,
  });

  const [error, setError] = useState("");

  if (!ride) {
    return (
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Ride not found</h1>

          <Link
            to="/my-rides"
            className="inline-block mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to My Rides
          </Link>
        </div>
      </div>
    );
  }

  const currentFormData = {
    from: formData.from ?? ride.from_location ?? ride.from ?? "",
    to: formData.to ?? ride.to_location ?? ride.to ?? "",
    date: formData.date ?? ride.ride_date ?? ride.date ?? "",
    time: formData.time ?? ride.departure_time ?? ride.time ?? "",
    seats:
      formData.seats ??
      ride.seats_available ??
      ride.seatsAvailable ??
      ride.seats ??
      "",
    vehicle: formData.vehicle ?? ride.vehicle ?? "",
    price: formData.price ?? ride.price ?? "",
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Reschedule mode
    if (isReschedule) {
      if (!currentFormData.date || !currentFormData.time) {
        setError("Please select a new date and departure time.");
        return;
      }

      const newDeparture = new Date(
        `${currentFormData.date}T${currentFormData.time}`,
      );

      if (Number.isNaN(newDeparture.getTime())) {
        setError("Invalid date or departure time.");
        return;
      }

      if (newDeparture <= new Date()) {
        setError("Rescheduled date and time must be in the future.");
        return;
      }

      const result = await rescheduleRide(
        ride.id,
        currentFormData.date,
        currentFormData.time,
      );

      if (result.success) {
        alert(result.message);
        navigate("/my-rides");
      } else {
        setError(result.message);
      }

      return;
    }

    // Existing normal Edit Ride validation continues here
    if (
      !currentFormData.from ||
      !currentFormData.to ||
      !currentFormData.date ||
      !currentFormData.time ||
      !currentFormData.seats ||
      !currentFormData.vehicle ||
      !currentFormData.price
    ) {
      setError("Please fill all the fields.");
      return;
    }

    if (
      Number(currentFormData.seats) < 1 ||
      Number(currentFormData.seats) > ride.seats_total
    ) {
      setError(
        `Available seats should be between 1 and ${ride.seats_total} (this ride's total capacity).`,
      );
      return;
    }

    if (Number(currentFormData.price) <= 0) {
      setError("Contribution should be greater than ₹0.");
      return;
    }

    const updatedRide = {
      from_location: currentFormData.from,
      to_location: currentFormData.to,
      ride_date: currentFormData.date,
      departure_time: currentFormData.time,
      vehicle: currentFormData.vehicle,
      seats_available: Number(currentFormData.seats),
      price: Number(currentFormData.price),
    };

    const result = await updateRide(ride.id, updatedRide);

    if (result.success) {
      alert(result.message);
      navigate("/my-rides");
    } else {
      setError(result.message);
    }
  };

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

            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="font-semibold text-blue-600">V</span>
            </div>
          </div>
        </div>
      </nav> */}

      {/* Main */}
      <main className="max-w-4xl mx-auto px-8 py-10 pb-32 md:pb-10">
        <div className="glass-crystal rounded-3xl p-8 md:p-10">
          <Link
            to="/my-rides"
            className="inline-flex items-center gap-2 text-slate-200 hover:text-blue-600"
          >
            <ArrowLeft size={18} />
            Back to My Rides
          </Link>

          <div className="mt-6">
            <h1 className="text-3xl font-bold text-slate-900">
              {isReschedule ? "Reschedule Ride" : "Edit Ride"}
            </h1>

            <p className="mt-2 text-slate-200">
              {isReschedule
                ? "Change the date and departure time of your ride."
                : "Update your ride details."}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="glass-crystal group bg-slate-300 border border-slate-100 rounded-2xl p-8 mt-8 shadow-sm animate-fade-in-up"
          >
            {/* Route */}
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Route Details
              </h2>

              <div className="grid md:grid-cols-2 gap-5 mt-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <MapPin size={16} className="text-blue-600" />
                    From
                  </label>

                  <PlaceInput
                    name="from"
                    value={currentFormData.from}
                    onChange={handleChange}
                    disabled={isReschedule}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Navigation size={16} className="text-blue-600" />
                    To
                  </label>

                  <PlaceInput
                    name="to"
                    value={currentFormData.to}
                    onChange={handleChange}
                    disabled={isReschedule}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                  />
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="border-t border-slate-400 mt-8 pt-8">
              <h2 className="text-lg font-bold text-slate-900">Schedule</h2>

              <div className="grid md:grid-cols-2 gap-5 mt-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <CalendarDays size={16} className="text-blue-600" />
                    Date
                  </label>

                  <input
                    type="date"
                    name="date"
                    value={currentFormData.date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Clock3 size={16} className="text-blue-600" />
                    Departure Time
                  </label>

                  <input
                    type="time"
                    name="time"
                    value={currentFormData.time}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                  />
                </div>
              </div>
            </div>

            {/* Ride Details */}
            <div className="glass-crystal group bg-slate-600 border-t rounded-lg border-slate-900 mt-8 p-8">
              <h2 className="text-lg font-bold text-slate-900">Ride Details</h2>

              <div className="grid md:grid-cols-2 gap-5 mt-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Users size={16} className="text-blue-600" />
                    Available Seats
                  </label>

                  <input
                    type="number"
                    name="seats"
                    min="1"
                    max={ride.seats_total}
                    value={currentFormData.seats}
                    onChange={handleChange}
                    disabled={isReschedule}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                  />

                  <p className="text-xs text-slate-500 mt-2">
                    Maximum {ride.seats_total} seats (this ride's total
                    capacity)
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Car size={16} className="text-blue-600" />
                    Vehicle
                  </label>

                  <input
                    type="text"
                    name="vehicle"
                    value={currentFormData.vehicle}
                    onChange={handleChange}
                    disabled={isReschedule}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <IndianRupee size={16} className="text-blue-600" />
                    Contribution per Seat
                  </label>

                  <input
                    type="number"
                    name="price"
                    min="1"
                    value={currentFormData.price}
                    onChange={handleChange}
                    disabled={isReschedule}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-6 px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="border-t border-slate-400 mt-8 pt-8 flex justify-end gap-3">
              <Link
                to="/my-rides"
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all active:scale-[0.98]"
              >
                {isReschedule ? "Reschedule Ride" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default EditRide;
