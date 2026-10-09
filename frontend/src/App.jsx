import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import FindRide from "./pages/FindRide";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RideDetails from "./pages/RideDetails";
import OfferRide from "./pages/OfferRide";
import MyRides from "./pages/MyRides";
import EditRide from "./pages/EditRide";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import AppBackground from "./components/AppBackground";

import bg1 from "./assets/bg-1-driving-pov.jpg";
import bg2 from "./assets/bg-2-city-drive.jpg";
import bg3 from "./assets/bg-3-auto-rickshaws.jpg";
import bg4 from "./assets/bg-4-bridge.jpg";
import bg5 from "./assets/bg-5-highway-aerial.jpg";
import bg6 from "./assets/bg-6-open-road.jpg";
import bg7 from "./assets/bg-7-sunset-highway.jpg";

const backgroundImages = [bg1, bg2, bg3, bg4, bg5, bg6, bg7];

function App() {
  return (
    <BrowserRouter>
      {/* Mounted once so the slideshow persists (doesn't restart) across navigation */}
      <AppBackground images={backgroundImages} intervalMs={7000} />

      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/find-ride"
          element={
            <ProtectedRoute>
              <FindRide />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ride/:rideId"
          element={
            <ProtectedRoute>
              <RideDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat/:rideId"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />

        <Route
          path="/offer-ride"
          element={
            <ProtectedRoute>
              <OfferRide />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-rides"
          element={
            <ProtectedRoute>
              <MyRides />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route path="/edit-ride/:rideId" element={<EditRide />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
