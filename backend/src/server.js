import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import rideRoutes from "./routes/rideRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import pool from "./config/db.js";

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join_user_room", ({ userId }) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their socket room`);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

app.use(cors());
app.use(express.json());
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes(io));

app.get("/", (req, res) => {
  res.json({
    message: "RideSync API is running 🚗",
  });
});

app.use("/api/rides", rideRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);

const PORT = process.env.PORT || 5000;

const markExpiredRidesAutomatically = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(`
      UPDATE rides
      SET status = 'Expired'
      WHERE status = 'Active'
        AND (
          ride_date + departure_time + INTERVAL '30 minutes'
        ) < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Calcutta')
      RETURNING
        id,
        driver_id,
        from_location,
        to_location,
        ride_date,
        departure_time,
        vehicle,
        seats_total,
        seats_available,
        price,
        status;
    `);

    if (result.rows.length === 0) {
      await client.query("COMMIT");
      return;
    }

    for (const ride of result.rows) {
      console.log(`Automatically expired ride: ${ride.id}`);

      // Get all confirmed passengers of this ride
      const passengersResult = await client.query(
        `
        SELECT
          b.id AS booking_id,
          b.passenger_id
        FROM bookings b
        WHERE b.ride_id = $1
          AND b.status = 'Confirmed'
        `,
        [ride.id],
      );

      // Create notification for every confirmed passenger
      for (const passenger of passengersResult.rows) {
        const notificationResult = await client.query(
          `
          INSERT INTO notifications
          (
            user_id,
            type,
            title,
            message,
            ride_id,
            booking_id
          )
          VALUES
          (
            $1,
            'RIDE_EXPIRED',
            'Ride Expired',
            $2,
            $3,
            $4
          )
          RETURNING *;
          `,
          [
            passenger.passenger_id,
            `Your ride from ${ride.from_location} to ${ride.to_location} has expired. The driver may reschedule it.`,
            ride.id,
            passenger.booking_id,
          ],
        );

        // Send notification instantly through Socket.IO
        io.to(`user_${passenger.passenger_id}`).emit(
          "new_notification",
          notificationResult.rows[0],
        );

        // Update passenger's ride instantly
        io.to(`user_${passenger.passenger_id}`).emit("ride_expired", {
          ride,
        });
      }

      // Update driver's ride instantly
      io.to(`user_${ride.driver_id}`).emit("ride_expired", {
        ride,
      });
    }

    await client.query("COMMIT");

    console.log(
      `Automatically expired rides: ${result.rows
        .map((ride) => ride.id)
        .join(", ")}`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Automatic ride expiry error:", error);
  } finally {
    client.release();
  }
};

setInterval(markExpiredRidesAutomatically, 60 * 1000);

markExpiredRidesAutomatically();

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`RideSync backend running on port ${PORT}`);
});