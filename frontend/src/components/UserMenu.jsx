import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut } from "lucide-react";
import { useAuth } from "../context/useAuth";

function UserMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen((previousState) => !previousState)}
        className="flex items-center gap-3"
      >
        <div className="hidden sm:block text-right">
          <p className="text-sm font-semibold text-slate-900">
            {user?.name}
          </p>
        </div>

        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="font-semibold text-blue-600">
            {user?.name?.charAt(0).toUpperCase()}
          </span>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-14 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50">
          {/* User Info */}
          <div className="px-3 py-3 border-b border-slate-100">
            <p className="font-semibold text-slate-900">
              {user?.name}
            </p>

            <p className="text-sm text-slate-500 mt-1">
              {user?.email}
            </p>
          </div>

          {/* Profile */}
          <button
            onClick={() => {
              setIsOpen(false);
              navigate("/profile");
            }}
            className="w-full flex items-center gap-3 px-3 py-3 mt-1 text-sm text-slate-700 rounded-lg hover:bg-slate-50"
          >
            <User size={18} />
            My Profile
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 text-sm text-red-600 rounded-lg hover:bg-red-50"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;