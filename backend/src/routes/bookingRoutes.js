import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ============================================================
// GET USER BOOKINGS
// ============================================================
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
        b.cancelled_at,

        r.driver_id,
        u.name AS driver_name,
        u.email AS driver_email,

        r.from_location,
        r.to_location,
        r.ride_date,
        r.departure_time,
        r.vehicle,
        r.price,
        r.status AS ride_status,
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

// ============================================================
// GET ALL BOOKINGS
// ============================================================
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

// ============================================================
// GET CONFIRMED PASSENGERS FOR A RIDE
// ============================================================
router.get("/ride/:rideId/passengers", verifyToken, async (req, res) => {
  try {
    const rideId = Number(req.params.rideId);

    if (!Number.isSafeInteger(rideId) || rideId <= 0) {
      return res.status(400).json({
        message: "Invalid ride ID",
      });
    }

    // Check that the logged-in user is the driver of this ride
    const rideResult = await pool.query(
      `
      SELECT driver_id
      FROM rides
      WHERE id = $1
      `,
      [rideId],
    );

    if (rideResult.rows.length === 0) {
      return res.status(404).json({
        message: "Ride not found",
      });
    }

    if (Number(rideResult.rows[0].driver_id) !== Number(req.userId)) {
      return res.status(403).json({
        message: "Only the driver can view ride passengers.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        b.id AS booking_id,
        b.passenger_id,
        b.booking_code,
        b.status,
        u.name AS passenger_name,
        u.email AS passenger_email

      FROM bookings b
      JOIN users u ON b.passenger_id = u.id

      WHERE b.ride_id = $1
        AND b.status = 'Confirmed'

      ORDER BY b.booked_at ASC
      `,
      [rideId],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching ride passengers:", error);

    res.status(500).json({
      message: "Failed to fetch ride passengers",
    });
  }
});

// ============================================================
// GET CHAT PARTICIPANTS FOR A RIDE
// Includes:
// - Confirmed passengers
// - Cancelled passengers within 10-minute chat grace period
// Driver only
// ============================================================
router.get(
  "/ride/:rideId/chat-participants",
  verifyToken,
  async (req, res) => {
    try {
      const rideId = Number(req.params.rideId);

      if (!Number.isSafeInteger(rideId) || rideId <= 0) {
        return res.status(400).json({
          message: "Invalid ride ID",
        });
      }

      // --------------------------------------------------------
      // Check that logged-in user is the driver
      // --------------------------------------------------------
      const rideResult = await pool.query(
        `
        SELECT driver_id
        FROM rides
        WHERE id = $1
        `,
        [rideId],
      );

      if (rideResult.rows.length === 0) {
        return res.status(404).json({
          message: "Ride not found",
        });
      }

      if (Number(rideResult.rows[0].driver_id) !== Number(req.userId)) {
        return res.status(403).json({
          message: "Only the driver can view ride chat participants.",
        });
      }

      // --------------------------------------------------------
      // Get confirmed passengers + recently cancelled passengers
      // --------------------------------------------------------
      const result = await pool.query(
        `
        SELECT
          b.id AS booking_id,
          b.passenger_id,
          b.booking_code,
          b.status,
          b.cancelled_at,

          u.name AS passenger_name,
          u.email AS passenger_email

        FROM bookings b

        JOIN users u
          ON b.passenger_id = u.id

        WHERE b.ride_id = $1

          AND (
            b.status = 'Confirmed'

            OR (
              b.status = 'Cancelled'
              AND b.cancelled_at IS NOT NULL
              AND b.cancelled_at >= CURRENT_TIMESTAMP - INTERVAL '10 minutes'
            )
          )

        ORDER BY
          CASE
            WHEN b.status = 'Confirmed' THEN 0
            ELSE 1
          END,
          b.booked_at ASC
        `,
        [rideId],
      );

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching chat participants:", error);

      res.status(500).json({
        message: "Failed to fetch chat participants",
      });
    }
  },
);

// ============================================================
// GET BOOKING BY ID
// ============================================================
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

// ============================================================
// CREATE BOOKING
// ============================================================
router.post("/", verifyToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { ride_id } = req.body;

    // Always get passenger ID from authenticated user
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

    // --------------------------------------------------------
    // Lock ride row
    // --------------------------------------------------------
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

    // --------------------------------------------------------
    // Check 30-minute expiry
    // --------------------------------------------------------
    const expiryCheck = await client.query(
      `
      SELECT
        (
          $1::date
          + $2::time
          + INTERVAL '30 minutes'
        ) < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Calcutta') AS expired
      `,
      [ride.ride_date, ride.departure_time],
    );

    if (expiryCheck.rows[0].expired) {
      // Keep database status synchronized
      await client.query(
        `
        UPDATE rides
        SET status = 'Expired'
        WHERE id = $1
        `,
        [rideId],
      );

      await client.query("COMMIT");

      return res.status(400).json({
        message: "This ride has expired and can no longer be booked.",
      });
    }

    // --------------------------------------------------------
    // Check ride status
    // --------------------------------------------------------
    if (ride.status !== "Active") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "This ride is no longer active",
      });
    }

    // --------------------------------------------------------
    // Driver cannot book own ride
    // --------------------------------------------------------
    if (Number(ride.driver_id) === Number(passengerId)) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "You cannot book your own ride",
      });
    }

    // --------------------------------------------------------
    // Check available seats
    // --------------------------------------------------------
    if (ride.seats_available <= 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "No seats available",
      });
    }

    // --------------------------------------------------------
    // Check existing booking
    // --------------------------------------------------------
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

      // ------------------------------------------------------
      // Already joined
      // ------------------------------------------------------
      if (existing.status === "Confirmed") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "You have already booked this ride",
        });
      }

      // ------------------------------------------------------
      // Rejoin after leaving
      // ------------------------------------------------------
      if (existing.status === "Cancelled") {
        const updatedBooking = await client.query(
          `
          UPDATE bookings
          SET
            status = 'Confirmed',
            booked_at = CURRENT_TIMESTAMP,
            cancelled_at = NULL
          WHERE id = $1
          RETURNING *
          `,
          [existing.id],
        );

        const updatedRideResult = await client.query(
          `
          UPDATE rides
          SET seats_available = seats_available - 1
          WHERE id = $1
          RETURNING
            driver_id,
            seats_available
          `,
          [rideId],
        );

        const updatedRide = updatedRideResult.rows[0];

        // Create rejoin notification
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
            'BOOKING_REJOINED',
            'Passenger Rejoined',
            (
              SELECT name
              FROM users
              WHERE id = $2
            ) || ' rejoined your ride from ' ||
            $3 || ' to ' || $4,
            $5,
            $6
          )
          RETURNING
            id,
            user_id,
            type,
            title,
            message,
            ride_id,
            booking_id,
            is_read,
            created_at
          `,
          [
            updatedRide.driver_id,
            passengerId,
            ride.from_location,
            ride.to_location,
            rideId,
            updatedBooking.rows[0].id,
          ],
        );

        await client.query("COMMIT");

        // ----------------------------------------------------
        // Real-time socket notification
        // ----------------------------------------------------
        const io = req.app.get("io");

        if (io) {
          io.to(`user_${updatedRide.driver_id}`).emit(
            "new_notification",
            notificationResult.rows[0],
          );

          io.to(`user_${updatedRide.driver_id}`).emit("ride_booking_created", {
            rideId,
            bookingId: updatedBooking.rows[0].id,
            passengerId,
            seatsAvailable: updatedRide.seats_available,
          });
        }

        return res.status(200).json({
          message: "Ride booked successfully",
          booking: updatedBooking.rows[0],
        });
      }
    }

    // --------------------------------------------------------
    // Generate booking code
    // --------------------------------------------------------
    const bookingCode = `RS-${Math.floor(100000 + Math.random() * 900000)}`;

    // --------------------------------------------------------
    // Create booking
    // --------------------------------------------------------
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

    // --------------------------------------------------------
    // Decrease available seats
    // --------------------------------------------------------
    const updatedRideResult = await client.query(
      `
      UPDATE rides
      SET seats_available = seats_available - 1
      WHERE id = $1
      RETURNING
        driver_id,
        seats_available
      `,
      [rideId],
    );

    const updatedRide = updatedRideResult.rows[0];

    // --------------------------------------------------------
    // Create driver notification
    // --------------------------------------------------------
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
        'BOOKING_CREATED',
        'New Passenger',
        (
          SELECT name
          FROM users
          WHERE id = $2
        ) || ' joined your ride from ' ||
        $3 || ' to ' || $4,
        $5,
        $6
      )
      RETURNING
        id,
        user_id,
        type,
        title,
        message,
        ride_id,
        booking_id,
        is_read,
        created_at
      `,
      [
        updatedRide.driver_id,
        passengerId,
        ride.from_location,
        ride.to_location,
        rideId,
        bookingResult.rows[0].id,
      ],
    );

    await client.query("COMMIT");

    // --------------------------------------------------------
    // Real-time socket events
    // --------------------------------------------------------
    const io = req.app.get("io");

    if (io) {
      console.log(
        "BOOKING NOTIFICATION SOCKET:",
        `user_${updatedRide.driver_id}`,
        notificationResult.rows[0],
      );

      // Driver notification
      io.to(`user_${updatedRide.driver_id}`).emit(
        "new_notification",
        notificationResult.rows[0],
      );

      // Update driver's RideDetails
      io.to(`user_${updatedRide.driver_id}`).emit("ride_booking_created", {
        rideId,
        bookingId: bookingResult.rows[0].id,
        passengerId,
        seatsAvailable: updatedRide.seats_available,
      });
    } else {
      console.log("BOOKING NOTIFICATION SOCKET: io is NOT available");
    }

    return res.status(201).json({
      message: "Ride booked successfully",
      booking: bookingResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error creating booking:", error);

    return res.status(500).json({
      message: "Failed to book ride",
    });
  } finally {
    client.release();
  }
});

// ============================================================
// CANCEL / LEAVE RIDE
// ============================================================
router.patch("/:id/cancel", verifyToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    // --------------------------------------------------------
    // Lock booking
    // --------------------------------------------------------
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

    // --------------------------------------------------------
    // Ownership check
    // --------------------------------------------------------
    if (Number(booking.passenger_id) !== Number(req.userId)) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        message: "You can only cancel your own bookings.",
      });
    }

    // --------------------------------------------------------
    // Already cancelled
    // --------------------------------------------------------
    if (booking.status === "Cancelled") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Booking is already cancelled",
      });
    }

    // --------------------------------------------------------
    // Only confirmed bookings can be cancelled
    // --------------------------------------------------------
    if (booking.status !== "Confirmed") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Only confirmed bookings can be cancelled",
      });
    }

    // --------------------------------------------------------
    // Cancel booking
    // --------------------------------------------------------
    const updatedBooking = await client.query(
      `
      UPDATE bookings
      SET
        status = 'Cancelled',
        cancelled_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [id],
    );

    // --------------------------------------------------------
    // Return seat and get driver info
    // --------------------------------------------------------
    const rideInfoResult = await client.query(
      `
      UPDATE rides
      SET seats_available = LEAST(seats_available + 1, seats_total)
      WHERE id = $1
      RETURNING
        driver_id,
        seats_available
      `,
      [booking.ride_id],
    );

    if (rideInfoResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Ride not found",
      });
    }

    const rideInfo = rideInfoResult.rows[0];

    // --------------------------------------------------------
    // Create notification for driver
    // --------------------------------------------------------
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
        'BOOKING_CANCELLED',
        'Passenger Left Ride',
        (
          SELECT name
          FROM users
          WHERE id = $2
        ) || ' left your ride',
        $3,
        $4
      )
      RETURNING
        id,
        user_id,
        type,
        title,
        message,
        ride_id,
        booking_id,
        is_read,
        created_at
      `,
      [rideInfo.driver_id, booking.passenger_id, booking.ride_id, booking.id],
    );

    await client.query("COMMIT");

    // --------------------------------------------------------
    // Real-time socket events
    // --------------------------------------------------------
    const io = req.app.get("io");

    if (io) {
      console.log(
        "BOOKING CANCELLED SOCKET:",
        `user_${rideInfo.driver_id}`,
        notificationResult.rows[0],
      );

      // Driver gets notification instantly
      io.to(`user_${rideInfo.driver_id}`).emit(
        "new_notification",
        notificationResult.rows[0],
      );

      // Driver's RideDetails gets updated instantly
      const cancellationPayload = {
        rideId: booking.ride_id,
        bookingId: booking.id,
        passengerId: booking.passenger_id,
        seatsAvailable: rideInfo.seats_available,
      };

      // Driver
      io.to(`user_${rideInfo.driver_id}`).emit(
        "ride_booking_cancelled",
        cancellationPayload,
      );

      // Passenger who left
      io.to(`user_${booking.passenger_id}`).emit(
        "ride_booking_cancelled",
        cancellationPayload,
      );
    } else {
      console.log("BOOKING CANCELLED SOCKET: io is NOT available");
    }

    return res.json({
      message: "Ride left successfully",
      booking: updatedBooking.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error cancelling booking:", error);

    return res.status(500).json({
      message: "Failed to leave ride",
    });
  } finally {
    client.release();
  }
});

export default router;
