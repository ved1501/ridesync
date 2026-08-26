import { Link } from "react-router-dom";
import { Search, Car, MapPin, Building2, ArrowRight } from "lucide-react";
import { useAuth } from "../context/useAuth";
import UserMenu from "../components/UserMenu";
import { useRide } from "../context/useRide";

function Dashboard() {
  const { user } = useAuth();

  const { rides, joinedRides, getRideStatus } = useRide();

  const offeredRides = rides
    .filter((ride) => Number(ride.driver_id) === Number(user?.id))
    .map((ride) => ({
      ...ride,
      from: ride.from_location,
      to: ride.to_location,
      date: ride.ride_date,
      time: ride.departure_time?.slice(0, 5),
    }));

  const userRides = [
    ...offeredRides.map((ride) => ({
      ...ride,
      rideType: "offered",
    })),
    ...joinedRides.map((ride) => ({
      ...ride,
      rideType: "joined",
    })),
  ];

  const upcomingRides = userRides.filter(
    (ride) => getRideStatus(ride) === "Active",
  );

  const upcomingRide = upcomingRides.sort((a, b) => {
    const dateA = new Date(`${a.ride_date}T${a.departure_time}`);
    const dateB = new Date(`${b.ride_date}T${b.departure_time}`);

    return dateA - dateB;
  })[0];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-2xl font-bold text-blue-600">
            RideSync
          </Link>

          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="text-blue-600 font-medium">
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
      <main className="max-w-7xl mx-auto px-8 py-10">
        {/* Welcome */}
        <div>
          <p className="text-slate-500">Tuesday, August 18</p>

          <h1 className="text-3xl font-bold text-slate-900 mt-1">
            Good afternoon, {user?.name || "there"}👋
          </h1>

          <p className="text-slate-600 mt-2">Where are you heading today?</p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <Link
            to="/find-ride"
            className="group bg-blue-600 text-white rounded-2xl p-7 hover:bg-blue-700 transition"
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
            className="group bg-white border border-slate-200 rounded-2xl p-7 hover:border-blue-300 hover:shadow-md transition"
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
            <h2 className="text-xl font-bold text-slate-900">Upcoming Ride</h2>

            <Link to="/my-rides" className="text-sm text-blue-600 font-medium">
              View all
            </Link>
          </div>

          {upcomingRide ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 mt-4">
              <div className="flex items-center justify-between">
                {/* Route */}
                <div className="flex items-center gap-5">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <MapPin size={20} className="text-blue-600" />
                    </div>

                    <div className="w-px h-8 bg-slate-300" />

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

                  <p className="text-sm text-slate-500 mt-1">
                    {upcomingRide.time}
                  </p>

                  <span className="inline-block mt-3 px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
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
            <div className="bg-white border border-slate-200 rounded-2xl p-8 mt-4 text-center">
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
      </main>
    </div>
  );
}

export default Dashboard;
