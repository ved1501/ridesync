import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, LogOut } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useState } from "react";
import { useRide } from "../context/useRide";
import Navbar from "../components/Navbar";

function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const { updateDriverInfo } = useRide();

  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
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

  const handleEdit = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
    });

    setError("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
    });

    setError("");
    setIsEditing(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    const result = await updateProfile({
      name: formData.name.trim(),
      email: formData.email.trim(),
    });

    if (result.success) {
      updateDriverInfo({
        ...user,
        name: formData.name.trim(),
        email: formData.email.trim(),
      });
    }

    if (!result.success) {
      setError(result.message);
      return;
    }

    alert(result.message);
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="relative z-10 min-h-screen">
      {/* Navbar */}

      <Navbar />
      {/* <nav className="glass-crystal sticky top-0 z-20 rounded-none border-x-0 border-t-0">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex flex-col items-center text-center">
            <span className="text-2xl font-bold text-blue-600 font-display">
              Ride<span className="text-green-600">Sync</span>
            </span>

            <span className="text-xs font-medium text-slate-600">
              Sync your ride, with RideSync.
            </span>
          </Link>

          <Link to="/dashboard" className="text-slate-600 hover:text-blue-600">
            Dashboard
          </Link>
        </div>
      </nav> */}

      {/* Main */}
      <main className="max-w-3xl mx-auto px-8 py-10 pb-32 md:pb-10">
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
          <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>

          <p className="mt-2 text-slate-200">
            View and manage your RideSync account information.
          </p>
        </div>

        {/* Profile Card */}
        <div className="glass-crystal group bg-slate-300 border border-slate-100 rounded-2xl p-8 mt-8 animate-fade-in-up">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-3xl font-bold text-blue-600">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-slate-900">
                  {user?.name}
                </h2>

                <p className="text-slate-500 mt-1">RideSync Member</p>
              </div>
            </div>

            {!isEditing && (
              <button
                onClick={handleEdit}
                className="px-5 py-2 bg-blue-800 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all active:scale-[0.98]"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Edit Form */}
          {isEditing ? (
            <form
              onSubmit={handleSubmit}
              className="border-t border-slate-200 mt-8 pt-8 space-y-5"
            >
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all active:scale-[0.98]"
                >
                  Save Changes
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Profile Details */
            <div className="border-t border-slate-200 mt-8 pt-8 space-y-5">
              {/* Name */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <User size={19} className="text-slate-600" />
                </div>

                <div>
                  <p className="text-xs text-slate-500">FULL NAME</p>

                  <p className="font-medium text-slate-900">{user?.name}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Mail size={19} className="text-slate-600" />
                </div>

                <div>
                  <p className="text-xs text-slate-500">EMAIL</p>

                  <p className="font-medium text-slate-900">{user?.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          <div className="border-t border-slate-200 mt-8 pt-8">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all active:scale-[0.98]"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
              </div>
      </main>
    </div>
  );
}

export default Profile;
