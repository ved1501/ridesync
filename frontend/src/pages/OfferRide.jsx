import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRide } from "../context/useRide";
import { useAuth } from "../context/useAuth";
// import UserMenu from "../components/UserMenu";
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
import Navbar from "../components/Navbar";
import LocationPicker from "../components/LocationPicker";
import StopsEditor from "../components/StopsEditor";
import { validateStopsInput } from "../utils/stops";

function OfferRide() {
  const navigate = useNavigate();
  const { addRide } = useRide();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    from: "",
    to: "",
    date: "",
    time: "",
    seats: "",
    vehicle: "",
    price: "",
  });

  const [stops, setStops] = useState([]);

  const [error, setError] = useState("");

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

    if (
      !formData.from ||
      !formData.to ||
      !formData.date ||
      !formData.time ||
      !formData.seats ||
      !formData.vehicle ||
      !formData.price
    ) {
      setError("Please fill all the fields.");
      return;
    }

    if (Number(formData.seats) < 1 || Number(formData.seats) > 6) {
      setError("Available seats should be between 1 and 6.");
      return;
    }

    if (Number(formData.price) <= 0) {
      setError("Contribution should be greater than ₹0.");
      return;
    }

    const stopsError = validateStopsInput(
      stops,
      Number(formData.price),
      formData.from,
      formData.to,
    );

    if (stopsError) {
      setError(stopsError);
      return;
    }

    console.log("FORM DATA BEFORE SUBMIT:", formData);

    const newRide = {
      driver_id: user.id,
      from_location: formData.from,
      to_location: formData.to,
      ride_date: formData.date,
      departure_time: formData.time,
      vehicle: formData.vehicle,
      seats_total: Number(formData.seats),
      seats_available: Number(formData.seats),
      price: Number(formData.price),
      stops: stops.map((stop) => ({
        location: stop.location.trim(),
        fare: Number(stop.fare),
      })),
    };

    const result = await addRide(newRide);

    if (result.success) {
      alert(result.message);
      navigate("/find-ride");
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

            <UserMenu />
          </div>
        </div>
      </nav> */}

      {/* Main */}
      <main className="max-w-4xl mx-auto px-8 py-10 pb-32 md:pb-10">
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
          <h1 className="text-3xl font-bold text-slate-900">Offer a Ride</h1>

          <p className="mt-2 text-slate-200">
            Share your empty seats with people travelling your way.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="glass-crystal group bg-slate-300 border border-slate-100 rounded-2xl p-8 mt-8 shadow-sm animate-fade-in-up"
        >
          {/* Route */}
          <div>
            <h2 className="text-lg font-bold text-slate-900">Route Details</h2>

            <div className="grid md:grid-cols-2 gap-5 mt-5">
              {/* From */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <MapPin size={16} className="text-blue-600" />
                  From
                </label>

                <LocationPicker
                  name="from"
                  value={formData.from}
                  onChange={handleChange}
                  placeholder="e.g. Gondia"
                  pickerTitle="Choose pickup location"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>

              {/* To */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Navigation size={16} className="text-blue-600" />
                  To
                </label>

                <LocationPicker
                  name="to"
                  value={formData.to}
                  onChange={handleChange}
                  placeholder="e.g. Fulchur"
                  pickerTitle="Choose drop-off location"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>
            </div>
          </div>

          {/* Stops on the way */}
          <StopsEditor
            stops={stops}
            onChange={(next) => {
              setStops(next);
              setError("");
            }}
            fromName={formData.from}
            toName={formData.to}
            totalPrice={Number(formData.price)}
          />

          {/* Schedule */}
          <div className="border-t border-slate-200 mt-8 pt-8">
            <h2 className="text-lg font-bold text-slate-900">Schedule</h2>

            <div className="grid md:grid-cols-2 gap-5 mt-5">
              {/* Date */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <CalendarDays size={16} className="text-blue-600" />
                  Date
                </label>

                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>

              {/* Time */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Clock3 size={16} className="text-blue-600" />
                  Departure Time
                </label>

                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>
            </div>
          </div>

          {/* Ride Details */}
          <div className="border-t border-slate-200 mt-8 pt-8">
            <h2 className="text-lg font-bold text-slate-900">Ride Details</h2>

            <div className="grid md:grid-cols-2 gap-5 mt-5">
              {/* Seats */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Users size={16} className="text-blue-600" />
                  Available Seats
                </label>

                <input
                  type="number"
                  name="seats"
                  min="1"
                  max="6"
                  value={formData.seats}
                  onChange={handleChange}
                  placeholder="e.g. 3"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                />

                <p className="text-xs text-slate-500 mt-2">Maximum 6 seats</p>
              </div>

              {/* Vehicle */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Car size={16} className="text-blue-600" />
                  Vehicle
                </label>

                <input
                  type="text"
                  name="vehicle"
                  value={formData.vehicle}
                  onChange={handleChange}
                  placeholder="e.g. Honda Amaze"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>

              {/* Price */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <IndianRupee size={16} className="text-blue-600" />
                  Contribution per Seat
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    ₹
                  </span>

                  <input
                    type="number"
                    name="price"
                    min="1"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="e.g. 75"
                    className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                  />
                </div>
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
          <div className="border-t border-slate-200 mt-8 pt-8 flex justify-end">
            <button
              type="submit"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all active:scale-[0.98]"
            >
              Offer Ride
            </button>
          </div>
        </form>
              </div>
      </main>
    </div>
  );
}

export default OfferRide;
