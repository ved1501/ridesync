import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
        <div className="text-2xl font-bold text-blue-600">
          RideSync
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="px-4 py-2 text-slate-700 hover:text-blue-600"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-8 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-blue-600 font-semibold mb-4">
            SMARTER COMMUTES. BETTER CONNECTIONS.
          </p>

          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight">
            Share your ride.
            <br />
            <span className="text-blue-600">Save your commute.</span>
          </h1>

          <p className="mt-6 text-lg text-slate-600 max-w-xl">
            RideSync helps office commuters find people travelling the same way,
            share rides, split costs, and make everyday travel easier.
          </p>

          <div className="flex gap-4 mt-8">
            <Link
              to="/login"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Find a Ride
            </Link>

            <Link
              to="/login"
              className="px-6 py-3 border border-slate-300 bg-white text-slate-700 rounded-lg font-medium hover:bg-slate-100"
            >
              Offer a Ride
            </Link>
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="text-6xl mb-6">🚗</div>

          <h2 className="text-2xl font-bold text-slate-900">
            Your daily commute,
            <br />
            made smarter.
          </h2>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <span className="text-2xl">📍</span>
              <div>
                <p className="text-sm text-slate-500">From</p>
                <p className="font-semibold">Home</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <span className="text-2xl">🏢</span>
              <div>
                <p className="text-sm text-slate-500">To</p>
                <p className="font-semibold">Office</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-600 font-semibold">HOW IT WORKS</p>

            <h2 className="text-3xl font-bold text-slate-900 mt-2">
              Your commute in three simple steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl bg-slate-50">
              <div className="text-3xl mb-4">🔎</div>
              <h3 className="text-xl font-bold">Find a Ride</h3>
              <p className="mt-2 text-slate-600">
                Search for people travelling along your route.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-50">
              <div className="text-3xl mb-4">🤝</div>
              <h3 className="text-xl font-bold">Join a Ride</h3>
              <p className="mt-2 text-slate-600">
                Choose a ride and reserve an available seat.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-50">
              <div className="text-3xl mb-4">💰</div>
              <h3 className="text-xl font-bold">Split the Cost</h3>
              <p className="mt-2 text-slate-600">
                Share travel expenses and make commuting affordable.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
