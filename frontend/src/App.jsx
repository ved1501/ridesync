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
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

function App() {
  return (
    <BrowserRouter>
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
