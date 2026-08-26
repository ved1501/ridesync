import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/user/:userId", verifyToken, async (req, res) => {
  const userId = Number(req.params.userId);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  if (userId !== req.userId) {
    return res.status(403).json({
      message: "You can only view your own bookings.",
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        b.id,
        b.ride_id,
        b.passenger_id,
        b.booking_code,
        b.status,
        b.booked_at,

        r.driver_id,
        u.name AS driver_name,
        u.email AS driver_email,

        r.from_location,
        r.to_location,
        r.ride_date,
        r.departure_time,
        r.vehicle,
        r.price,
        r.from_location,
r.to_location,
r.ride_date,
r.departure_time,
r.vehicle,
r.price,
r.seats_available

      FROM bookings b
      JOIN rides r ON b.ride_id = r.id
      JOIN users u ON r.driver_id = u.id

     WHERE b.passenger_id = $1
      ORDER BY b.booked_at DESC
      `,
      [userId],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching user bookings:", error);

    res.status(500).json({
      message: "Failed to fetch user bookings",
    });
  }
});

// GET all bookings
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.id,
        b.ride_id,
        b.passenger_id,
        b.booking_code,
        b.status,
        b.booked_at,

        u.name AS passenger_name,
        u.email AS passenger_email,

        r.driver_id,
        driver.name AS driver_name,
        r.from_location,
        r.to_location,
        r.ride_date,
        r.departure_time,
        r.vehicle,
        r.price

      FROM bookings b
      JOIN users u ON b.passenger_id = u.id
      JOIN rides r ON b.ride_id = r.id
      JOIN users driver ON r.driver_id = driver.id

      ORDER BY b.booked_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching bookings:", error);

    res.status(500).json({
      message: "Failed to fetch bookings",
    });
  }
});

// GET booking by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        b.id,
        b.ride_id,
        b.passenger_id,
        b.booking_code,
        b.status,
        b.booked_at,

        u.name AS passenger_name,
        u.email AS passenger_email,

        r.driver_id,
        driver.name AS driver_name,
        r.from_location,
        r.to_location,
        r.ride_date,
        r.departure_time,
        r.vehicle,
        r.price

      FROM bookings b
      JOIN users u ON b.passenger_id = u.id
      JOIN rides r ON b.ride_id = r.id
      JOIN users driver ON r.driver_id = driver.id

      WHERE b.id = $1
    `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching booking:", error);

    res.status(500).json({
      message: "Failed to fetch booking",
    });
  }
});

// CREATE booking
router.post("/", verifyToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { ride_id } = req.body;

    // passenger_id always comes from the authenticated user, never the body,
    // so nobody can book a ride pretending to be someone else.
    const passengerId = req.userId;
    const rideId = Number(ride_id);

    if (
      !Number.isSafeInteger(rideId) ||
      !Number.isSafeInteger(passengerId) ||
      rideId <= 0 ||
      passengerId <= 0
    ) {
      return res.status(400).json({
        message: "Invalid ride or passenger ID",
      });
    }

    await client.query("BEGIN");

    // Lock the ride row
    const rideResult = await client.query(
      `
      SELECT *
      FROM rides
      WHERE id = $1
      FOR UPDATE
      `,
      [rideId],
    );

    if (rideResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Ride not found",
      });
    }

    const ride = rideResult.rows[0];

    const rideDateTime = new Date(
      `${ride.ride_date.toISOString().split("T")[0]}T${ride.departure_time}`,
    );

    const now = new Date();

    if (rideDateTime <= now) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "This ride has already departed",
      });
    }

    // Check ride status
    if (ride.status !== "Active") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "This ride is no longer active",
      });
    }

    // Driver cannot book their own ride
    if (Number(ride.driver_id) === passengerId) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "You cannot book your own ride",
      });
    }

    // Check available seats
    if (ride.seats_available <= 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "No seats available",
      });
    }

    // Check duplicate booking
    const existingBooking = await client.query(
      `
  SELECT *
  FROM bookings
  WHERE ride_id = $1
  AND passenger_id = $2
  FOR UPDATE
  `,
      [rideId, passengerId],
    );

    if (existingBooking.rows.length > 0) {
      const existing = existingBooking.rows[0];

      // Already joined
      if (existing.status === "Confirmed") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "You have already booked this ride",
        });
      }

      // Rejoin after leaving
      if (existing.status === "Cancelled") {
        const updatedBooking = await client.query(
          `
      UPDATE bookings
      SET
        status = 'Confirmed',
        booked_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
          [existing.id],
        );

        await client.query(
          `
      UPDATE rides
      SET seats_available = seats_available - 1
      WHERE id = $1
      `,
          [rideId],
        );

        await client.query("COMMIT");

        return res.status(200).json({
          message: "Ride booked successfully",
          booking: updatedBooking.rows[0],
        });
      }
    }

    // Check if passenger had previously cancelled this ride
    const cancelledBooking = await client.query(
      `
  SELECT id
  FROM bookings
  WHERE ride_id = $1
  AND passenger_id = $2
  AND status = 'Cancelled'
  `,
      [rideId, passengerId],
    );

    if (cancelledBooking.rows.length > 0) {
      const rejoinedBooking = await client.query(
        `
    UPDATE bookings
    SET status = 'Confirmed',
        booked_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
    `,
        [cancelledBooking.rows[0].id],
      );

      await client.query(
        `
    UPDATE rides
    SET seats_available = seats_available - 1
    WHERE id = $1
    `,
        [rideId],
      );

      await client.query("COMMIT");

      return res.status(200).json({
        message: "Ride booked successfully",
        booking: rejoinedBooking.rows[0],
      });
    }

    // Generate booking code
    const bookingCode = `RS-${Math.floor(100000 + Math.random() * 900000)}`;

    // Create booking
    const bookingResult = await client.query(
      `
      INSERT INTO bookings
      (
        ride_id,
        passenger_id,
        booking_code,
        status
      )
      VALUES ($1, $2, $3, 'Confirmed')
      RETURNING *
      `,
      [rideId, passengerId, bookingCode],
    );

    // Decrease available seats
    await client.query(
      `
      UPDATE rides
      SET seats_available = seats_available - 1
      WHERE id = $1
      `,
      [rideId],
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Ride booked successfully",
      booking: bookingResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error creating booking:", error);

    res.status(500).json({
      message: "Failed to book ride",
    });
  } finally {
    client.release();
  }
});

// CANCEL / LEAVE RIDE
router.patch("/:id/cancel", verifyToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    // Booking ko lock karo
    const bookingResult = await client.query(
      `
      SELECT *
      FROM bookings
      WHERE id = $1
      FOR UPDATE
      `,
      [id],
    );

    if (bookingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Booking not found",
      });
    }

    const booking = bookingResult.rows[0];

    // Ownership check: only the passenger who made this booking can cancel it
    if (Number(booking.passenger_id) !== Number(req.userId)) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        message: "You can only cancel your own bookings.",
      });
    }

    // Already cancelled
    if (booking.status === "Cancelled") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Booking is already cancelled",
      });
    }

    // Sirf confirmed booking cancel hogi
    if (booking.status !== "Confirmed") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Only confirmed bookings can be cancelled",
      });
    }

    // Booking cancel karo
    const updatedBooking = await client.query(
      `
      UPDATE bookings
      SET status = 'Cancelled'
      WHERE id = $1
      RETURNING *
      `,
      [id],
    );

    // Ride ki seat wapas add karo
    await client.query(
      `
      UPDATE rides
      SET seats_available = LEAST(seats_available + 1, seats_total)
      WHERE id = $1
      `,
      [booking.ride_id],
    );

    await client.query("COMMIT");

    res.json({
      message: "Ride left successfully",
      booking: updatedBooking.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error cancelling booking:", error);

    res.status(500).json({
      message: "Failed to leave ride",
    });
  } finally {
    client.release();
  }
});

export default router;
