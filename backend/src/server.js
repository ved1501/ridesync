import "dotenv/config";
import express from "express";
import cors from "cors";
import rideRoutes from "./routes/rideRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "RideSync API is running 🚗",
  });
});

app.use("/api/rides", rideRoutes);
app.use("/api/bookings", bookingRoutes);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`RideSync backend running on port ${PORT}`);
});