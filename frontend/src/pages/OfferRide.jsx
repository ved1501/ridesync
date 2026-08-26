import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  IndianRupee,
} from "lucide-react";

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
      <main className="max-w-4xl mx-auto px-8 py-10">
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
          <h1 className="text-3xl font-bold text-slate-900">Offer a Ride</h1>

          <p className="mt-2 text-slate-600">
            Share your empty seats with people travelling your way.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-8 mt-8 shadow-sm"
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

                <input
                  type="text"
                  name="from"
                  value={formData.from}
                  onChange={handleChange}
                  placeholder="e.g. Gondia"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
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
                  name="to"
                  value={formData.to}
                  onChange={handleChange}
                  placeholder="e.g. Fulchur"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

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
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Offer Ride
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default OfferRide;
