import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET current user's notifications
router.get("/", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        type,
        title,
        message,
        ride_id,
        booking_id,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching notifications:", error);

    res.status(500).json({
      message: "Failed to fetch notifications",
    });
  }
});

// MARK notification as read
router.patch("/:id/read", verifyToken, async (req, res) => {
  try {
    const notificationId = Number(req.params.id);

    if (!Number.isSafeInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        message: "Invalid notification ID",
      });
    }

    const result = await pool.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1
      AND user_id = $2
      RETURNING *
      `,
      [notificationId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    res.json({
      message: "Notification marked as read",
      notification: result.rows[0],
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);

    res.status(500).json({
      message: "Failed to update notification",
    });
  }
});

// MARK ALL notifications as read
router.patch("/read-all", verifyToken, async (req, res) => {
  try {
    await pool.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1
      AND is_read = FALSE
      `,
      [req.userId]
    );

    res.json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);

    res.status(500).json({
      message: "Failed to update notifications",
    });
  }
});

// DELETE single notification
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const notificationId = Number(req.params.id);

    if (!Number.isSafeInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        message: "Invalid notification ID",
      });
    }

    const result = await pool.query(
      `
      DELETE FROM notifications
      WHERE id = $1
      AND user_id = $2
      RETURNING id
      `,
      [notificationId, req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    res.json({
      message: "Notification deleted successfully",
      notificationId,
    });
  } catch (error) {
    console.error("Error deleting notification:", error);

    res.status(500).json({
      message: "Failed to delete notification",
    });
  }
});

// DELETE all notifications for current user
router.delete("/", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM notifications
      WHERE user_id = $1
      `,
      [req.userId],
    );

    res.json({
      message: "All notifications deleted successfully",
      deletedCount: result.rowCount,
    });
  } catch (error) {
    console.error("Error deleting all notifications:", error);

    res.status(500).json({
      message: "Failed to delete notifications",
    });
  }
});

export default router;