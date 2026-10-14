import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Car,
  MapPin,
  Building2,
  ArrowRight,
  Users,
  Wallet,
  Route,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
// import UserMenu from "../components/UserMenu";
import Navbar from "../components/Navbar";
import { useRide } from "../context/useRide";
import { authFetch } from "../utils/api";

function Dashboard() {
  const API_URL =
    import.meta.env.VITE_API_URL || "http://192.168.31.200:5000/api";

  const { user, token } = useAuth();

  const [dashboardStats, setDashboardStats] = useState({
    totalRidesOffered: 0,
    totalRidesJoined: 0,
    totalEarnings: 0,
  });

  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardStats = async () => {
      if (!user?.id || !token) {
        if (isMounted) {
          setDashboardStats({
            totalRidesOffered: 0,
            totalRidesJoined: 0,
            totalEarnings: 0,
          });

          setLoadingStats(false);
        }

        return;
      }

      setLoadingStats(true);

      try {
        const response = await authFetch(
          `${API_URL}/rides/stats/dashboard`,
          token,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard statistics");
        }

        const data = await response.json();

        if (isMounted) {
          setDashboardStats({
            totalRidesOffered: Number(data.total_rides_offered) || 0,
            totalRidesJoined: Number(data.total_rides_joined) || 0,
            totalEarnings: Number(data.total_earnings) || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching dashboard statistics:", error);
      } finally {
        if (isMounted) {
          setLoadingStats(false);
        }
      }
    };

    fetchDashboardStats();

    return () => {
      isMounted = false;
    };
  }, [user?.id, token]);

  const formatRideDate = (date) => {
    if (!date) return "";

    const dateString = String(date);

    // Already formatted date ko dobara format mat karo
    if (!/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
      return dateString;
    }

    const [year, month, day] = dateString.slice(0, 10).split("-");

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

  const now = new Date();

  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const hour = now.getHours();

  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const { rides, joinedRides, getRideStatus } = useRide();

  const offeredRides = rides
    .filter((ride) => Number(ride.driver_id) === Number(user?.id))
    .map((ride) => ({
      ...ride,
      from: ride.from_location,
      to: ride.to_location,
      date: formatRideDate(ride.ride_date),
      time: ride.departure_time?.slice(0, 5),
    }));

  const userRides = [
    ...offeredRides.map((ride) => ({
      ...ride,
      rideType: "offered",
    })),
    ...joinedRides.map((ride) => ({
      ...ride,
      date: formatRideDate(ride.date || ride.ride_date),
      rideType: "joined",
    })),
  ];

  const upcomingRides = userRides.filter((ride) => {
    const isCancelled =
      ride.status === "Cancelled" ||
      ride.bookingStatus === "Cancelled" ||
      ride.rideStatus === "Cancelled";

    return (
      !isCancelled && ["Active", "In Progress"].includes(getRideStatus(ride))
    );
  });

  const upcomingRide = [...upcomingRides].sort((a, b) => {
    const dateA = new Date(`${a.ride_date}T${a.departure_time}`);
    const dateB = new Date(`${b.ride_date}T${b.departure_time}`);

    return dateA - dateB;
  })[0];

  return (
    <div className="relative z-10 min-h-screen">
      {/* Navbar */}

      <Navbar showDashboard={false} />
      {/* <nav className="glass-crystal backdrop-blur-md sticky top-0 z-20 rounded-none border-x-0 border-t-0">
        
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex flex-col items-center text-center"
          >
            <span className="text-2xl font-bold text-blue-600 font-display">
              Ride<span className="text-green-600">Sync</span>
            </span>

            <span className="text-xs font-medium text-slate-600">
              Sync your ride, with RideSync.
            </span>
          </Link>

          <div className="flex items-center gap-6">
            {/* <Link to="/dashboard" className="text-blue-600 font-medium">
              Dashboard
            </Link> */}

      {/* <Link to="/my-rides" className="text-slate-600 hover:text-blue-600">
              My Rides
            </Link>

            <UserMenu />
          </div>
        </div> */}
      {/* </nav> */}

      {/* Main */}
      <main className="max-w-7xl mx-auto px-8 py-10 pb-32 md:pb-10">
        <div className="glass-crystal rounded-3xl p-8 md:p-10">
          {/* Welcome */}
          <div>
            <p className="text-slate-100">{formattedDate}</p>

            <h1 className="text-3xl font-bold text-slate-900 mt-1">
              {greeting}, {user?.name || "there"} 👋
            </h1>

            <p className="text-slate-100 mt-2">Where are you heading today?</p>
          </div>

          {/* Dashboard Statistics */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {/* Total Rides Offered */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Rides Offered
                  </p>

                  <h3 className="text-3xl font-bold text-slate-900 mt-3">
                    {loadingStats ? "..." : dashboardStats.totalRidesOffered}
                  </h3>
                </div>

                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Route size={25} />
                </div>
              </div>

              <p className="text-sm text-slate-500 mt-4">
                Rides shared with others
              </p>
            </div>

            {/* Total Rides Joined */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Rides Joined
                  </p>

                  <h3 className="text-3xl font-bold text-slate-900 mt-3">
                    {loadingStats ? "..." : dashboardStats.totalRidesJoined}
                  </h3>
                </div>

                <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                  <Users size={25} />
                </div>
              </div>

              <p className="text-sm text-slate-500 mt-4">Your ride bookings</p>
            </div>

            {/* Total Earnings */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Earnings
                  </p>

                  <h3 className="text-3xl font-bold text-slate-900 mt-3">
                    {loadingStats
                      ? "..."
                      : new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 2,
                        }).format(dashboardStats.totalEarnings)}
                  </h3>
                </div>

                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Wallet size={25} />
                </div>
              </div>

              <p className="text-sm text-slate-500 mt-4">
                Earnings from completed rides
              </p>
            </div>
          </section>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <Link
              to="/find-ride"
              className="group bg-blue-600 text-white rounded-2xl p-7 hover:bg-blue-700 hover:-translate-y-1 active:scale-[0.98] transition-all"
            >
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Search size={25} />
              </div>

              <h2 className="text-2xl font-bold mt-6">Find a Ride</h2>

              <p className="mt-2 text-blue-100">
                Find someone travelling along your route.
              </p>

              <div className="flex items-center gap-2 mt-6 font-medium">
                Search rides
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition"
                />
              </div>
            </Link>

            <Link
              to="/offer-ride"
              className="group bg-white border border-slate-100 rounded-2xl p-7 hover:border-blue-300 hover:shadow-md hover:-translate-y-1 active:scale-[0.98] transition-all"
            >
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <Car size={25} />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mt-6">
                Offer a Ride
              </h2>

              <p className="mt-2 text-slate-600">
                Have empty seats? Share your ride with coworkers.
              </p>

              <div className="flex items-center gap-2 mt-6 font-medium text-blue-600">
                Offer your ride
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition"
                />
              </div>
            </Link>
          </div>

          {/* Upcoming Ride */}
          <section className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Upcoming Ride
              </h2>

              <Link
                to="/my-rides"
                className="text-sm text-blue-600 font-medium"
              >
                View all
              </Link>
            </div>

            {upcomingRide ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 mt-4 animate-fade-in-up hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  {/* Route */}
                  <div className="flex items-center gap-5">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <MapPin size={20} className="text-blue-600" />
                      </div>

                      <div className="relative w-px h-8 border-l-2 border-dashed border-slate-300">
                        <span className="route-dot-y absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent-500" />
                      </div>

                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Building2 size={20} className="text-green-600" />
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <p className="text-xs text-slate-500">FROM</p>

                        <p className="font-semibold text-slate-900">
                          {upcomingRide.from}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">TO</p>

                        <p className="font-semibold text-slate-900">
                          {upcomingRide.to}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Date / Time / Status */}
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {upcomingRide.date}
                    </p>

                    <p className="text-sm text-slate-600 mt-1">
                      {upcomingRide.time}
                    </p>

                    <span className="inline-block mt-10 px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      {upcomingRide.rideType === "joined"
                        ? "Confirmed"
                        : "Offering"}
                    </span>
                  </div>
                </div>

                {/* View Ride */}
                <div className="border-t border-slate-200 mt-6 pt-5">
                  <Link
                    to={`/ride/${upcomingRide.id}`}
                    className="text-sm text-blue-600 font-medium hover:text-blue-700"
                  >
                    View Ride →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-2xl p-8 mt-4 text-center">
                <div className="text-4xl">🚗</div>

                <h3 className="text-lg font-semibold text-slate-900 mt-3">
                  No upcoming rides
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  You don't have any upcoming rides yet.
                </p>

                <Link
                  to="/find-ride"
                  className="inline-block mt-5 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Find a Ride
                </Link>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
