import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
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

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

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
      [id],
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

// CREATE ride
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

    // driver_id always comes from the authenticated user, never from the body,
    // so nobody can create a ride pretending to be someone else.
    const driver_id = req.userId;

    // Validate required fields
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Active')
      RETURNING *;
      `,
      [
        driver_id,
        from_location,
        to_location,
        ride_date,
        departure_time,
        vehicle,
        seats_total,
        seats_available,
        price,
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

// UPDATE ride
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const rideId = Number(id);

    if (!Number.isSafeInteger(rideId) || rideId <= 0) {
      return res.status(400).json({
        message: "Invalid ride ID",
      });
    }

    // Ownership check: only the driver who created this ride can edit it
    const ownerCheck = await pool.query(
      `SELECT driver_id FROM rides WHERE id = $1`,
      [rideId],
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Ride not found",
      });
    }

    if (Number(ownerCheck.rows[0].driver_id) !== Number(req.userId)) {
      return res.status(403).json({
        message: "You can only edit rides you offered.",
      });
    }

    const {
      from_location,
      to_location,
      ride_date,
      departure_time,
      vehicle,
      seats_available,
      price,
    } = req.body;

    // Validate required fields
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
      RETURNING *;
      `,
      [
        from_location,
        to_location,
        ride_date,
        departure_time,
        vehicle,
        seats_available,
        price,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Ride not found",
      });
    }

    res.json({
      message: "Ride updated successfully!",
      ride: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating ride:", error);

    res.status(500).json({
      message: "Failed to update ride",
    });
  }
});

// CANCEL ride
router.put("/:id/cancel", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const ownerCheck = await pool.query(
      `SELECT driver_id FROM rides WHERE id = $1`,
      [id],
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Ride not found",
      });
    }

    if (Number(ownerCheck.rows[0].driver_id) !== Number(req.userId)) {
      return res.status(403).json({
        message: "You can only cancel rides you offered.",
      });
    }

    const result = await pool.query(
      `
      UPDATE rides
      SET status = 'Cancelled'
      WHERE id = $1
      RETURNING *;
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Ride not found",
      });
    }

    res.status(200).json({
      message: "Ride cancelled successfully!",
      ride: result.rows[0],
    });
  } catch (error) {
    console.error("Error cancelling ride:", error);

    res.status(500).json({
      message: "Failed to cancel ride",
    });
  }
});

// COMPLETE RIDE
router.put("/:id/complete", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const ownerCheck = await pool.query(
      `SELECT driver_id FROM rides WHERE id = $1`,
      [id],
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

    const result = await pool.query(
      `
      UPDATE rides
      SET status = 'Completed'
      WHERE id = $1
      AND status = 'Active'
      RETURNING *
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Ride cannot be completed",
      });
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

// DELETE ride
router.delete("/:id", verifyToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const rideId = Number(id);

    if (!Number.isSafeInteger(rideId) || rideId <= 0) {
      return res.status(400).json({
        message: "Invalid ride ID",
      });
    }

    await client.query("BEGIN");

    const ownerCheck = await client.query(
      `SELECT driver_id FROM rides WHERE id = $1`,
      [rideId],
    );

    if (ownerCheck.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Ride not found",
      });
    }

    if (Number(ownerCheck.rows[0].driver_id) !== Number(req.userId)) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        message: "You can only delete rides you offered.",
      });
    }

    // Block deletion if passengers have an active (Confirmed) booking on this ride
    const activeBookings = await client.query(
      `
      SELECT id
      FROM bookings
      WHERE ride_id = $1
      AND status = 'Confirmed'
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

    // Safe to remove any leftover (already-cancelled) booking rows for this ride
    await client.query(`DELETE FROM bookings WHERE ride_id = $1`, [rideId]);

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
    await client.query("ROLLBACK");

    console.error("Error deleting ride:", error);

    res.status(500).json({
      message: "Failed to delete ride",
    });
  } finally {
    client.release();
  }
});

export default router;
