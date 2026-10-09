import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ============================================================
// HELPER: Automatically mark expired rides
// Ride expires 30 minutes after scheduled departure.
// ============================================================

const markExpiredRides = async () => {
  try {
    await pool.query(`
      UPDATE rides
      SET status = 'Expired'
      WHERE status = 'Active'
        AND (
          ride_date + departure_time + INTERVAL '30 minutes'
        ) < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Calcutta')
    `);
  } catch (error) {
    console.error("Error marking expired rides:", error);
  }
};

// ============================================================
// GET ALL RIDES
// ============================================================

router.get("/", async (req, res) => {
  try {
    await markExpiredRides();

    const result = await pool.query(`
      SELECT
        r.id,
        r.driver_id,
        u.name AS driver_name,
        u.email AS driver_email,
        r.from_location,
        r.to_location,
        TO_CHAR(r.ride_date, 'YYYY-MM-DD') AS ride_date,
        r.departure_time,
        r.vehicle,
        r.seats_total,
        r.seats_available,
        r.price,
        r.status
      FROM rides r
      JOIN users u ON r.driver_id = u.id
      ORDER BY r.ride_date, r.departure_time;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching rides:", error);

    res.status(500).json({
      message: "Failed to fetch rides",
    });
  }
});

// ============================================================
// GET SINGLE RIDE
// ============================================================

router.get("/:id", async (req, res) => {
  try {
    await markExpiredRides();

    const rideId = Number(req.params.id);

    if (!Number.isSafeInteger(rideId) || rideId <= 0) {
      return res.status(400).json({
        message: "Invalid ride ID",
      });
    }

    const result = await pool.query(
      `
      SELECT
        r.id,
        r.driver_id,
        u.name AS driver_name,
        u.email AS driver_email,
        r.from_location,
        r.to_location,
        TO_CHAR(r.ride_date, 'YYYY-MM-DD') AS ride_date,
        r.departure_time,
        r.vehicle,
        r.seats_total,
        r.seats_available,
        r.price,
        r.status
      FROM rides r
      JOIN users u ON r.driver_id = u.id
      WHERE r.id = $1
      `,
      [rideId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Ride not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching ride:", error);

    res.status(500).json({
      message: "Failed to fetch ride",
    });
  }
});

// ============================================================
// CREATE RIDE
// ============================================================

router.post("/", verifyToken, async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);

    const {
      from_location,
      to_location,
      ride_date,
      departure_time,
      vehicle,
      seats_total,
      seats_available,
      price,
    } = req.body;

    // Authenticated user is always the driver.
    const driver_id = req.userId;

    // --------------------------------------------------------
    // Required fields
    // --------------------------------------------------------

    if (
      !from_location ||
      !to_location ||
      !ride_date ||
      !departure_time ||
      !vehicle ||
      seats_total === undefined ||
      seats_available === undefined ||
      price === undefined
    ) {
      return res.status(400).json({
        message: "All ride fields are required",
      });
    }

    // --------------------------------------------------------
    // Numeric validation
    // --------------------------------------------------------

    const totalSeats = Number(seats_total);
    const availableSeats = Number(seats_available);
    const ridePrice = Number(price);

    if (!Number.isInteger(totalSeats) || totalSeats < 1 || totalSeats > 6) {
      return res.status(400).json({
        message: "Total seats must be between 1 and 6.",
      });
    }

    if (
      !Number.isInteger(availableSeats) ||
      availableSeats < 0 ||
      availableSeats > totalSeats
    ) {
      return res.status(400).json({
        message: `Available seats must be between 0 and ${totalSeats}.`,
      });
    }

    if (!Number.isFinite(ridePrice) || ridePrice < 0) {
      return res.status(400).json({
        message: "Price cannot be negative.",
      });
    }

    // --------------------------------------------------------
    // Date/time validation
    // --------------------------------------------------------

    const departureCheck = await pool.query(
      `
      SELECT
        ($1::date + $2::time) >
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Calcutta')
        AS is_future
      `,
      [ride_date, departure_time],
    );

    if (!departureCheck.rows[0].is_future) {
      return res.status(400).json({
        message: "Ride date and time must be in the future.",
      });
    }

    // --------------------------------------------------------
    // Create ride
    // --------------------------------------------------------

    const result = await pool.query(
      `
      INSERT INTO rides (
        driver_id,
        from_location,
        to_location,
        ride_date,
        departure_time,
        vehicle,
        seats_total,
        seats_available,
        price,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        'Active'
      )
      RETURNING *;
      `,
      [
        driver_id,
        from_location.trim(),
        to_location.trim(),
        ride_date,
        departure_time,
        vehicle.trim(),
        totalSeats,
        availableSeats,
        ridePrice,
      ],
    );

    res.status(201).json({
      message: "Ride created successfully!",
      ride: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating ride:", error);
    console.error("PostgreSQL message:", error.message);
    console.error("PostgreSQL detail:", error.detail);
    console.error("PostgreSQL code:", error.code);

    res.status(500).json({
      message: "Failed to create ride",
    });
  }
});

// ============================================================
// UPDATE ACTIVE RIDE
// Normal edit is allowed ONLY for Active rides.
// Expired rides must use /reschedule.
// ============================================================

router.put("/:id", verifyToken, async (req, res) => {
  try {
    const rideId = Number(req.params.id);

    if (!Number.isSafeInteger(rideId) || rideId <= 0) {
      return res.status(400).json({
        message: "Invalid ride ID",
      });
    }

    // --------------------------------------------------------
    // Get ride ownership + capacity information
    // --------------------------------------------------------

    const ownerCheck = await pool.query(
      `
      SELECT
        driver_id,
        status,
        seats_total,
        seats_available
      FROM rides
      WHERE id = $1
      `,
      [rideId],
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Ride not found",
      });
    }

    const existingRide = ownerCheck.rows[0];

    // --------------------------------------------------------
    // Ownership check
    // --------------------------------------------------------

    if (Number(existingRide.driver_id) !== Number(req.userId)) {
      return res.status(403).json({
        message: "You can only edit rides you offered.",
      });
    }

    // --------------------------------------------------------
    // Status check
    // --------------------------------------------------------

    if (existingRide.status !== "Active") {
      return res.status(400).json({
        message:
          "Only active rides can be edited. Expired rides can only be rescheduled.",
      });
    }

    // --------------------------------------------------------
    // Request body
    // --------------------------------------------------------

    const {
      from_location,
      to_location,
      ride_date,
      departure_time,
      vehicle,
      seats_available,
      price,
    } = req.body;

    // --------------------------------------------------------
    // Required fields
    // --------------------------------------------------------

    if (
      !from_location ||
      !to_location ||
      !ride_date ||
      !departure_time ||
      !vehicle ||
      seats_available === undefined ||
      price === undefined
    ) {
      return res.status(400).json({
        message: "All ride fields are required",
      });
    }

    // --------------------------------------------------------
    // Count confirmed passengers
    // --------------------------------------------------------

    const confirmedBookings = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM bookings
      WHERE ride_id = $1
        AND status = 'Confirmed'
      `,
      [rideId],
    );

    const confirmedPassengerCount = confirmedBookings.rows[0].count;

    const maxAvailableSeats =
      Number(existingRide.seats_total) - confirmedPassengerCount;

    // --------------------------------------------------------
    // Validate available seats
    // --------------------------------------------------------

    const availableSeats = Number(seats_available);

    if (
      !Number.isInteger(availableSeats) ||
      availableSeats < 0 ||
      availableSeats > maxAvailableSeats
    ) {
      return res.status(400).json({
        message: `Available seats must be between 0 and ${maxAvailableSeats}.`,
      });
    }

    // --------------------------------------------------------
    // Validate price
    // --------------------------------------------------------

    const ridePrice = Number(price);

    if (!Number.isFinite(ridePrice) || ridePrice < 0) {
      return res.status(400).json({
        message: "Price cannot be negative.",
      });
    }

    // --------------------------------------------------------
    // Validate new departure date/time
    // --------------------------------------------------------

    const departureCheck = await pool.query(
      `
      SELECT
        ($1::date + $2::time) >
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Calcutta')
        AS is_future
      `,
      [ride_date, departure_time],
    );

    if (!departureCheck.rows[0].is_future) {
      return res.status(400).json({
        message: "Ride date and time must be in the future.",
      });
    }

    // --------------------------------------------------------
    // Update ride
    // --------------------------------------------------------

    const result = await pool.query(
      `
      UPDATE rides
      SET
        from_location = $1,
        to_location = $2,
        ride_date = $3,
        departure_time = $4,
        vehicle = $5,
        seats_available = $6,
        price = $7
      WHERE id = $8
        AND driver_id = $9
        AND status = 'Active'
      RETURNING *;
      `,
      [
        from_location.trim(),
        to_location.trim(),
        ride_date,
        departure_time,
        vehicle.trim(),
        availableSeats,
        ridePrice,
        rideId,
        req.userId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Ride could not be updated.",
      });
    }

    res.status(200).json({
      message: "Ride updated successfully!",
      ride: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating ride:", error);

    res.status(500).json({
      message: "Failed to update ride.",
    });
  }
});

// ============================================================
// RESCHEDULE EXPIRED RIDE
// Only date/time can be changed.
// From, To, Seats, Vehicle and Price remain unchanged.
// ============================================================

router.put("/:id/reschedule", verifyToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const rideId = Number(req.params.id);
    const { ride_date, departure_time } = req.body;

    if (!Number.isSafeInteger(rideId) || rideId <= 0) {
      return res.status(400).json({
        message: "Invalid ride ID",
      });
    }

    if (!ride_date || !departure_time) {
      return res.status(400).json({
        message: "New ride date and departure time are required.",
      });
    }

    await client.query("BEGIN");

    // --------------------------------------------------------
    // Lock ride
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
    // Ownership
    // --------------------------------------------------------

    if (Number(ride.driver_id) !== Number(req.userId)) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        message: "You can only reschedule rides you offered.",
      });
    }

    // --------------------------------------------------------
    // Must be expired
    // --------------------------------------------------------

    if (ride.status !== "Expired") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Only expired rides can be rescheduled.",
      });
    }

    // --------------------------------------------------------
    // New date/time must be future
    // --------------------------------------------------------

    const departureCheck = await client.query(
      `
      SELECT
        ($1::date + $2::time) >
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Calcutta')
        AS is_future
      `,
      [ride_date, departure_time],
    );

    if (!departureCheck.rows[0].is_future) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "New ride date and time must be in the future.",
      });
    }

    // --------------------------------------------------------
    // Get confirmed passengers before updating
    // --------------------------------------------------------

    const passengersResult = await client.query(
      `
      SELECT
        b.id AS booking_id,
        b.passenger_id,
        u.name AS passenger_name
      FROM bookings b
      JOIN users u ON b.passenger_id = u.id
      WHERE b.ride_id = $1
        AND b.status = 'Confirmed'
      FOR UPDATE OF b
      `,
      [rideId],
    );

    // --------------------------------------------------------
    // Update ONLY date/time
    // --------------------------------------------------------

    const updateRideResult = await client.query(
      `
      UPDATE rides
      SET
        ride_date = $1,
        departure_time = $2,
        status = 'Active'
      WHERE id = $3
        AND status = 'Expired'
      RETURNING *
      `,
      [ride_date, departure_time, rideId],
    );

    if (updateRideResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Ride could not be rescheduled.",
      });
    }

    // --------------------------------------------------------
    // Create passenger notifications
    // --------------------------------------------------------

    const notificationRows = [];

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
          'RIDE_RESCHEDULED',
          'Ride Rescheduled',
          'Your ride from ' ||
          $2 ||
          ' to ' ||
          $3 ||
          ' has been rescheduled by the driver. New departure: ' ||
          $4 ||
          ' at ' ||
          $5 ||
          '.',
          $6,
          $7
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
          passenger.passenger_id,
          ride.from_location,
          ride.to_location,
          ride_date,
          departure_time,
          rideId,
          passenger.booking_id,
        ],
      );

      notificationRows.push(notificationResult.rows[0]);
    }

    // --------------------------------------------------------
    // COMMIT FIRST
    // Important: database changes must succeed before socket
    // notifications are sent.
    // --------------------------------------------------------

    await client.query("COMMIT");

    // --------------------------------------------------------
    // Real-time updates AFTER COMMIT
    // --------------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      const updatedRide = updateRideResult.rows[0];

      // Driver
      io.to(`user_${ride.driver_id}`).emit("ride_rescheduled", {
        ride: updatedRide,
      });

      // Passengers
      for (let index = 0; index < passengersResult.rows.length; index++) {
        const passenger = passengersResult.rows[index];

        io.to(`user_${passenger.passenger_id}`).emit("new_notification", {
          ...notificationRows[index],
        });

        io.to(`user_${passenger.passenger_id}`).emit("ride_rescheduled", {
          ride: updatedRide,
          bookingId: passenger.booking_id,
        });
      }
    }

    res.status(200).json({
      message: "Ride rescheduled successfully!",
      ride: updateRideResult.rows[0],
      notifiedPassengers: passengersResult.rows.length,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }

    console.error("Error rescheduling ride:", error);

    res.status(500).json({
      message: "Failed to reschedule ride.",
    });
  } finally {
    client.release();
  }
});

// ============================================================
// CANCEL RIDE
// Only ACTIVE rides can be cancelled.
// ============================================================

router.put("/:id/cancel", verifyToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const rideId = Number(req.params.id);

    if (!Number.isSafeInteger(rideId) || rideId <= 0) {
      return res.status(400).json({
        message: "Invalid ride ID",
      });
    }

    await client.query("BEGIN");

    // --------------------------------------------------------
    // Lock ride
    // --------------------------------------------------------

    const rideResult = await client.query(
      `
      SELECT
        r.*,
        u.name AS driver_name
      FROM rides r
      JOIN users u ON r.driver_id = u.id
      WHERE r.id = $1
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
    // Ownership
    // --------------------------------------------------------

    if (Number(ride.driver_id) !== Number(req.userId)) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        message: "You can only cancel rides you offered.",
      });
    }

    // --------------------------------------------------------
    // Only Active rides can be cancelled
    // --------------------------------------------------------

    if (ride.status !== "Active") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: `Ride cannot be cancelled because its status is "${ride.status}".`,
      });
    }

    // --------------------------------------------------------
    // Get confirmed passengers
    // --------------------------------------------------------

    const passengersResult = await client.query(
      `
      SELECT
        b.id AS booking_id,
        b.passenger_id,
        u.name AS passenger_name
      FROM bookings b
      JOIN users u ON b.passenger_id = u.id
      WHERE b.ride_id = $1
        AND b.status = 'Confirmed'
      FOR UPDATE OF b
      `,
      [rideId],
    );

    // --------------------------------------------------------
    // Cancel ride
    // --------------------------------------------------------

    const updateRideResult = await client.query(
      `
  UPDATE rides
  SET
    status = 'Cancelled',
    cancelled_at = CURRENT_TIMESTAMP
  WHERE id = $1
    AND status = 'Active'
  RETURNING *
  `,
      [rideId],
    );

    if (updateRideResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Ride could not be cancelled.",
      });
    }

    // --------------------------------------------------------
    // Cancel confirmed bookings
    // --------------------------------------------------------

    await client.query(
      `
  UPDATE bookings
  SET
    status = 'Cancelled',
    cancelled_at = CURRENT_TIMESTAMP
  WHERE ride_id = $1
    AND status = 'Confirmed'
  `,
      [rideId],
    );

    // --------------------------------------------------------
    // Notifications
    // --------------------------------------------------------

    const notificationRows = [];

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
          'RIDE_CANCELLED',
          'Ride Cancelled',
          'Your ride from ' ||
          $2 ||
          ' to ' ||
          $3 ||
          ' has been cancelled by the driver.',
          $4,
          $5
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
          passenger.passenger_id,
          ride.from_location,
          ride.to_location,
          rideId,
          passenger.booking_id,
        ],
      );

      notificationRows.push(notificationResult.rows[0]);
    }

    // --------------------------------------------------------
    // COMMIT FIRST
    // --------------------------------------------------------

    await client.query("COMMIT");

    // --------------------------------------------------------
    // Real-time updates AFTER COMMIT
    // --------------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      const cancelledRide = updateRideResult.rows[0];

      // Driver
      io.to(`user_${ride.driver_id}`).emit("ride_cancelled", {
        ride: cancelledRide,
      });

      // Passengers
      for (let index = 0; index < passengersResult.rows.length; index++) {
        const passenger = passengersResult.rows[index];

        io.to(`user_${passenger.passenger_id}`).emit(
          "new_notification",
          notificationRows[index],
        );

        io.to(`user_${passenger.passenger_id}`).emit("ride_cancelled", {
          ride: cancelledRide,
          bookingId: passenger.booking_id,
        });
      }
    }

    res.status(200).json({
      message: "Ride cancelled successfully!",
      ride: updateRideResult.rows[0],
      cancelledPassengers: passengersResult.rows.length,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }

    console.error("Error cancelling ride:", error);

    res.status(500).json({
      message: "Failed to cancel ride",
    });
  } finally {
    client.release();
  }
});

// ============================================================
// START RIDE
// Active ride -> In Progress
// ============================================================

router.put("/:id/start", verifyToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const rideId = Number(req.params.id);

    if (!Number.isSafeInteger(rideId) || rideId <= 0) {
      return res.status(400).json({
        message: "Invalid ride ID",
      });
    }

    await client.query("BEGIN");

    // Lock ride so expiry/start cannot race each other.
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

    // Ownership
    if (Number(ride.driver_id) !== Number(req.userId)) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        message: "You can only start rides you offered.",
      });
    }

    // Must be Active
    if (ride.status !== "Active") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: `Ride cannot be started because its status is "${ride.status}".`,
      });
    }

    // --------------------------------------------------------
    // Hard expiry protection
    // Even if the automatic expiry worker hasn't run yet,
    // an old ride cannot be started.
    // --------------------------------------------------------

    const expiryCheck = await client.query(
      `
      SELECT
        ($1::date + $2::time + INTERVAL '30 minutes')
        <
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Calcutta')
        AS expired
      `,
      [ride.ride_date, ride.departure_time],
    );

    if (expiryCheck.rows[0].expired) {
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
        message:
          "This ride has expired and can no longer be started. You can reschedule it.",
      });
    }

    // --------------------------------------------------------
    // Start ride
    // --------------------------------------------------------

    const result = await client.query(
      `
      UPDATE rides
      SET status = 'In Progress'
      WHERE id = $1
        AND status = 'Active'
      RETURNING *
      `,
      [rideId],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Ride cannot be started.",
      });
    }

    await client.query("COMMIT");

    // --------------------------------------------------------
    // Real-time ride update
    // Send ride_started to driver + confirmed passengers
    // --------------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      const startedRide = result.rows[0];

      // Driver
      io.to(`user_${ride.driver_id}`).emit("ride_started", {
        ride: startedRide,
      });

      // Confirmed passengers
      const passengersResult = await pool.query(
        `
    SELECT passenger_id
    FROM bookings
    WHERE ride_id = $1
      AND status = 'Confirmed'
    `,
        [rideId],
      );

      for (const passenger of passengersResult.rows) {
        io.to(`user_${passenger.passenger_id}`).emit("ride_started", {
          ride: startedRide,
        });
      }
    }

    res.json({
      message: "Ride started!",
      ride: result.rows[0],
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }

    console.error("Error starting ride:", error);

    res.status(500).json({
      message: "Failed to start ride",
    });
  } finally {
    client.release();
  }
});

// ============================================================
// COMPLETE RIDE
// In Progress -> Completed
// ============================================================

router.put("/:id/complete", verifyToken, async (req, res) => {
  try {
    const rideId = Number(req.params.id);

    if (!Number.isSafeInteger(rideId) || rideId <= 0) {
      return res.status(400).json({
        message: "Invalid ride ID",
      });
    }

    const ownerCheck = await pool.query(
      `
      SELECT
        driver_id,
        status
      FROM rides
      WHERE id = $1
      `,
      [rideId],
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Ride not found",
      });
    }

    if (Number(ownerCheck.rows[0].driver_id) !== Number(req.userId)) {
      return res.status(403).json({
        message: "You can only complete rides you offered.",
      });
    }

    if (ownerCheck.rows[0].status !== "In Progress") {
      return res.status(400).json({
        message: "Only rides in progress can be completed.",
      });
    }

    const result = await pool.query(
      `
      UPDATE rides
      SET status = 'Completed'
      WHERE id = $1
        AND status = 'In Progress'
      RETURNING *
      `,
      [rideId],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Ride cannot be completed.",
      });
    }

    // --------------------------------------------------------
    // Real-time ride update
    // Send ride_completed to driver + confirmed passengers
    // --------------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      const completedRide = result.rows[0];

      // Driver
      io.to(`user_${ownerCheck.rows[0].driver_id}`).emit("ride_completed", {
        ride: completedRide,
      });

      // Confirmed passengers
      const passengersResult = await pool.query(
        `
    SELECT passenger_id
    FROM bookings
    WHERE ride_id = $1
      AND status = 'Confirmed'
    `,
        [rideId],
      );

      for (const passenger of passengersResult.rows) {
        io.to(`user_${passenger.passenger_id}`).emit("ride_completed", {
          ride: completedRide,
        });
      }
    }

    res.json({
      message: "Ride completed successfully",
      ride: result.rows[0],
    });
  } catch (error) {
    console.error("Error completing ride:", error);

    res.status(500).json({
      message: "Failed to complete ride",
    });
  }
});

// ============================================================
// DELETE RIDE
// Only delete rides without confirmed passengers.
// ============================================================

router.delete("/:id", verifyToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const rideId = Number(req.params.id);

    if (!Number.isSafeInteger(rideId) || rideId <= 0) {
      return res.status(400).json({
        message: "Invalid ride ID",
      });
    }

    await client.query("BEGIN");

    // --------------------------------------------------------
    // Get ride + lock it
    // --------------------------------------------------------

    const ownerCheck = await client.query(
      `
      SELECT
        driver_id,
        status
      FROM rides
      WHERE id = $1
      FOR UPDATE
      `,
      [rideId],
    );

    if (ownerCheck.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Ride not found",
      });
    }

    // --------------------------------------------------------
    // Ownership
    // --------------------------------------------------------

    if (Number(ownerCheck.rows[0].driver_id) !== Number(req.userId)) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        message: "You can only delete rides you offered.",
      });
    }

    // --------------------------------------------------------
    // Check confirmed bookings
    // --------------------------------------------------------

    const activeBookings = await client.query(
      `
      SELECT id
      FROM bookings
      WHERE ride_id = $1
        AND status = 'Confirmed'
      FOR UPDATE
      `,
      [rideId],
    );

    if (activeBookings.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "This ride has passengers who have already joined. Cancel the ride instead of deleting it.",
      });
    }

    // --------------------------------------------------------
    // Delete leftover booking records
    // --------------------------------------------------------

    await client.query(
      `
      DELETE FROM bookings
      WHERE ride_id = $1
      `,
      [rideId],
    );

    // --------------------------------------------------------
    // Delete ride
    // --------------------------------------------------------

    const result = await client.query(
      `
      DELETE FROM rides
      WHERE id = $1
      RETURNING *
      `,
      [rideId],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Ride not found",
      });
    }

    await client.query("COMMIT");

    res.json({
      message: "Ride deleted successfully!",
      ride: result.rows[0],
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }

    console.error("Error deleting ride:", error);

    res.status(500).json({
      message: "Failed to delete ride",
    });
  } finally {
    client.release();
  }
});

export default router;
