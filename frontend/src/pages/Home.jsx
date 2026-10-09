import { Link } from "react-router-dom";
import { MapPin, Building2 } from "lucide-react";
import RouteLine from "../components/RouteLine";

function Home() {
  return (
    <div className="relative isolate z-10 min-h-screen">
      {/* Scrollable content — background is provided globally by AppBackground in App.jsx */}
      <div className="relative z-10">
        {/* Navbar — glass, sticky */}
        <nav className="glass-crystal backdrop-blur-md sticky top-0 z-20 rounded-none border-x-0 border-t-0">
          <div className="flex items-center justify-between px-4 py-6">
            <Link to="/" className="flex flex-col items-center text-center">
            <span className="text-2xl font-bold text-blue-600 font-display">
              Ride<span className="text-green-600">Sync</span>
            </span>

            <span className="text-xs font-medium text-slate-600">
              Sync your ride, with RideSync.
            </span>
          </Link>
            <div className="flex items-center gap-4">
              {/* <Link
                to="/login"
                className="px-4 py-2 text-slate-700 hover:text-blue-600 transition-colors"
              >
                Login
              </Link> */}

              <Link
                to="/register"
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95"
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="max-w-7xl mx-auto px-8 py-24 grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <p className="text-green-600 font-bold mb-4 tracking-wide text-xl">
              SMARTER COMMUTES. BETTER CONNECTIONS.
            </p>

            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight drop-shadow-sm">
              Share your ride.
              <br />
              <span className="text-green-600">Save your commute.</span>
            </h1>

            <p className="mt-6 text-lg text-slate-200 max-w-xl">
              RideSync helps office commuters find people travelling the same way,
              share rides, split costs, and make everyday travel easier.
            </p>

            <div className="flex gap-4 mt-8">
              <Link
                to="/login"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all active:scale-95"
              >
                Find a Ride
              </Link>

              <Link
                to="/login"
                className="glass-crystal px-6 py-3 text-white rounded-lg font-medium hover:bg-white/20 transition-all active:scale-95"
              >
                Offer a Ride
              </Link>
            </div>
          </div>

          {/* Hero Card — crystal glass + floating + route-line signature */}
          <div className="glass-crystal animate-float animate-fade-in-up [animation-delay:200ms] relative rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-slate-900">
              Your daily commute,
              <br />
              made smarter.
            </h2>

            <div className="mt-8 gap-5">

              <div className="flex-1 space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-100">FROM</p>
                    <p className="font-semibold text-slate-900">Home</p>
                  </div>
                </div>
              <RouteLine orientation="horizontal" />

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-100">TO</p>
                    <p className="font-semibold text-slate-900">Office</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-8 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-green-600 font-bold tracking-wide text-xl">
                HOW IT WORKS
              </p>

              <h2 className="text-3xl font-bold text-white mt-2 drop-shadow-sm">
                Your commute in three simple steps
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="glass-crystal p-6 rounded-xl hover:-translate-y-1 transition-all">
                <div className="w-11 h-11 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-display font-semibold mb-4">
                  1
                </div>
                <h3 className="text-xl font-bold text-slate-900">Find a Ride</h3>
                <p className="mt-2 text-slate-700">
                  Search for people travelling along your route.
                </p>
              </div>

              <div className="glass-crystal p-6 rounded-xl hover:-translate-y-1 transition-all">
                <div className="w-11 h-11 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-display font-semibold mb-4">
                  2
                </div>
                <h3 className="text-xl font-bold text-slate-900">Join a Ride</h3>
                <p className="mt-2 text-slate-700">
                  Choose a ride and reserve an available seat.
                </p>
              </div>

              <div className="glass-crystal p-6 rounded-xl hover:-translate-y-1 transition-all">
                <div className="w-11 h-11 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-display font-semibold mb-4">
                  3
                </div>
                <h3 className="text-xl font-bold text-slate-900">Split the Cost</h3>
                <p className="mt-2 text-slate-700">
                  Share travel expenses and make commuting affordable.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;
