import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// CREATE a review (passenger reviews the driver for a completed ride)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { ride_id, rating, comment } = req.body;

    const rideId = Number(ride_id);
    const ratingValue = Number(rating);
    const passengerId = req.userId;

    if (!Number.isSafeInteger(rideId) || rideId <= 0) {
      return res.status(400).json({
        message: "Invalid ride ID",
      });
    }

    if (
      !Number.isSafeInteger(ratingValue) ||
      ratingValue < 1 ||
      ratingValue > 5
    ) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    // Ride must exist and be Completed
    const rideResult = await pool.query(
      `SELECT id, driver_id, status FROM rides WHERE id = $1`,
      [rideId],
    );

    if (rideResult.rows.length === 0) {
      return res.status(404).json({
        message: "Ride not found",
      });
    }

    const ride = rideResult.rows[0];

    if (ride.status !== "Completed") {
      return res.status(400).json({
        message: "You can only review a ride after it has been completed.",
      });
    }

    // Passenger must have had a confirmed booking on this ride
    const bookingResult = await pool.query(
      `
      SELECT id
      FROM bookings
      WHERE ride_id = $1
      AND passenger_id = $2
      AND status = 'Confirmed'
      `,
      [rideId, passengerId],
    );

    if (bookingResult.rows.length === 0) {
      return res.status(403).json({
        message: "You can only review rides you actually joined.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO reviews (ride_id, driver_id, passenger_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [rideId, ride.driver_id, passengerId, ratingValue, comment || null],
    );

    res.status(201).json({
      message: "Review submitted successfully!",
      review: result.rows[0],
    });
  } catch (error) {
    // Unique constraint violation = already reviewed this ride
    if (error.code === "23505") {
      return res.status(400).json({
        message: "You've already reviewed this ride.",
      });
    }

    console.error("Error creating review:", error);

    res.status(500).json({
      message: "Failed to submit review",
    });
  }
});

// GET all reviews for a driver, plus average rating and count
router.get("/driver/:driverId", async (req, res) => {
  try {
    const driverId = Number(req.params.driverId);

    if (!Number.isSafeInteger(driverId) || driverId <= 0) {
      return res.status(400).json({
        message: "Invalid driver ID",
      });
    }

    const reviewsResult = await pool.query(
      `
      SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.name AS passenger_name
      FROM reviews r
      JOIN users u ON r.passenger_id = u.id
      WHERE r.driver_id = $1
      ORDER BY r.created_at DESC
      `,
      [driverId],
    );

    const summaryResult = await pool.query(
      `
      SELECT
        COALESCE(AVG(rating), 0) AS average_rating,
        COUNT(*) AS review_count
      FROM reviews
      WHERE driver_id = $1
      `,
      [driverId],
    );

    res.json({
      averageRating: Number(summaryResult.rows[0].average_rating),
      reviewCount: Number(summaryResult.rows[0].review_count),
      reviews: reviewsResult.rows,
    });
  } catch (error) {
    console.error("Error fetching driver reviews:", error);

    res.status(500).json({
      message: "Failed to fetch reviews",
    });
  }
});

// CHECK whether the logged-in user already reviewed a specific ride
router.get("/ride/:rideId/mine", verifyToken, async (req, res) => {
  try {
    const rideId = Number(req.params.rideId);

    if (!Number.isSafeInteger(rideId) || rideId <= 0) {
      return res.status(400).json({
        message: "Invalid ride ID",
      });
    }

    const result = await pool.query(
      `
      SELECT id, rating, comment
      FROM reviews
      WHERE ride_id = $1
      AND passenger_id = $2
      `,
      [rideId, req.userId],
    );

    res.json({
      reviewed: result.rows.length > 0,
      review: result.rows[0] || null,
    });
  } catch (error) {
    console.error("Error checking review:", error);

    res.status(500).json({
      message: "Failed to check review status",
    });
  }
});

export default router;