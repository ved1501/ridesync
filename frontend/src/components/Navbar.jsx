import { Link, useLocation } from "react-router-dom";
import { Home, ClipboardList, User } from "lucide-react";
import UserMenu from "./UserMenu";
import NotificationBell from "./NotificationBell";
import FloatingBell from "./FloatingBell";

function Navbar({ showDashboard = true, showMyRides = true }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* =========================================================
          DESKTOP NAVBAR
      ========================================================= */}
      <nav className="hidden md:block glass-crystal sticky top-0 z-20 rounded-none border-x-0 border-t-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/dashboard"
            className="flex flex-col items-center text-center"
          >
            <span className="text-2xl font-bold text-blue-600 font-display">
              Ride<span className="text-green-600">Sync</span>
            </span>

            <span className="text-xs font-medium text-slate-800">
              Sync your ride, with RideSync.
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="flex items-center gap-3 sm:gap-6">
            {showDashboard && (
              <Link
                to="/dashboard"
                className="px-3 py-2 text-slate-900 hover:text-slate-100 border-b-1 border-transparent hover:border-slate-100 transition-colors"
              >
                Dashboard
              </Link>
            )}

            {showMyRides && (
              <Link
                to="/my-rides"
                className="px-3 py-2 text-slate-900 border-b-1 border-transparent hover:border-slate-100 hover:text-slate-100 transition-all"
              >
                My Rides
              </Link>
            )}

            <NotificationBell />

            <UserMenu />
          </div>
        </div>
      </nav>

      {/* =========================================================
          MOBILE TOP BAR
      ========================================================= */}
      <nav className="md:hidden relative glass-crystal mobile-navbar top-0 z-30 rounded-none border-x-0 border-t-0">
        <div className="px-5 py-4 flex flex-col items-center justify-center">
          <Link
            to="/dashboard"
            className="text-2xl font-bold text-blue-600 font-display"
          >
            Ride<span className="text-green-600">Sync</span>
          </Link>
          <span className="text-xs font-medium text-slate-800">
            Sync your ride, with RideSync.
          </span>
        </div>
      </nav>

      {/* Draggable notification bubble (mobile only) */}
      <FloatingBell />

     {/* =========================================================
    MOBILE BOTTOM NAVIGATION
========================================================= */}
<nav className="md:hidden fixed bottom-0 left-0 bg-white right-0 z-50 bg-white mobile-navbar rounded-none border-t border-slate-200 shadow-lg">
  <div className="flex items-center bg-white justify-around px-2 py-2">
    
    {/* Home */}
    <Link
      to="/dashboard"
      className={`flex flex-col items-center justify-center min-w-0 flex-1 transition-all duration-200 ${
        isActive("/dashboard")
          ? "text-blue-600"
          : "text-slate-500 hover:text-blue-600"
      }`}
    >
      <div
        className={`flex items-center justify-center w-14 h-12 rounded-2xl transition-all duration-200 ${
          isActive("/dashboard")
            ? "bg-blue-600 text-white -translate-y-4 shadow-md"
            : "text-slate-500"
        }`}
      >
        <Home
          size={21}
          strokeWidth={isActive("/dashboard") ? 2.5 : 2}
        />
      </div>

      <span
        className={`text-[11px] font-medium mt-0.5 ${
          isActive("/dashboard")
            ? "text-blue-600"
            : "text-slate-500"
        }`}
      >
        Home
      </span>
    </Link>


    {/* My Rides */}
    <Link
      to="/my-rides"
      className={`flex flex-col items-center justify-center min-w-0 flex-1 transition-all duration-200 ${
        isActive("/my-rides")
          ? "text-blue-600"
          : "text-slate-500 hover:text-blue-600"
      }`}
    >
      <div
        className={`flex items-center justify-center w-14 h-12 rounded-2xl transition-all duration-200 ${
          isActive("/my-rides")
            ? "bg-blue-600 text-white -translate-y-4 shadow-md"
            : "text-slate-500"
        }`}
      >
        <ClipboardList
          size={21}
          strokeWidth={isActive("/my-rides") ? 2.5 : 2}
        />
      </div>

      <span
        className={`text-[11px] font-medium mt-0.5 ${
          isActive("/my-rides")
            ? "text-blue-600"
            : "text-slate-500"
        }`}
      >
        My Rides
      </span>
    </Link>


    {/* Profile */}
    <Link
      to="/profile"
      className={`flex flex-col items-center justify-center min-w-0 flex-1 transition-all duration-200 ${
        isActive("/profile")
          ? "text-blue-600"
          : "text-slate-500 hover:text-blue-600"
      }`}
    >
      <div
        className={`flex items-center justify-center w-14 h-12 rounded-2xl transition-all duration-200 ${
          isActive("/profile")
            ? "bg-blue-600 text-white -translate-y-4 shadow-md"
            : "text-slate-500"
        }`}
      >
        <User
          size={21}
          strokeWidth={isActive("/profile") ? 2.5 : 2}
        />
      </div>

      <span
        className={`text-[11px] font-medium mt-0.5 ${
          isActive("/profile")
            ? "text-blue-600"
            : "text-slate-500"
        }`}
      >
        Profile
      </span>
    </Link>

  </div>
</nav>
    </>
  );
}

export default Navbar;

{
  /* Find Ride */
}
{
  /* <Link
              to="/find-ride"
              className={`flex flex-col items-center justify-center gap-1 min-w-0 flex-1 py-1.5 rounded-xl transition-all ${
                isActive("/find-ride")
                  ? "text-blue-600"
                  : "text-slate-500 hover:text-blue-600"
              }`}
            >
              <Search
                size={21}
                strokeWidth={isActive("/find-ride") ? 2.5 : 2}
              />
  
              <span className="text-[11px] font-medium">Find</span>
            </Link> */
}

{
  /* Offer Ride */
}
{
  /* <Link
              to="/offer-ride"
              className={`flex flex-col items-center justify-center gap-1 min-w-0 flex-1 py-1.5 rounded-xl transition-all ${
                isActive("/offer-ride")
                  ? "text-blue-600"
                  : "text-slate-500 hover:text-blue-600"
              }`}
            >
              <Car
                size={21}
                strokeWidth={isActive("/offer-ride") ? 2.5 : 2}
              />
  
              <span className="text-[11px] font-medium">Offer</span>
            </Link> */
}
