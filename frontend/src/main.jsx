import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { RideProvider } from "./context/RideContext";
import { AuthProvider } from "./context/AuthProvider";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <RideProvider>
        <App />
      </RideProvider>
    </AuthProvider>
  </StrictMode>
);