import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const CHAT_GRACE_PERIOD_MS = 10 * 60 * 1000;

export default function createMessageRoutes(io) {
  const router = express.Router();

  // ============================================================
  // GET CHAT INFORMATION
  // ============================================================
  const getChatInfo = async (rideId, userId, receiverId) => {
    const result = await pool.query(
      `
      SELECT
        r.id,
        r.driver_id,
        r.status AS ride_status,
        r.cancelled_at AS ride_cancelled_at,

        b.id AS booking_id,
        b.passenger_id,
        b.status AS booking_status,
        b.cancelled_at AS booking_cancelled_at

      FROM rides r

      LEFT JOIN bookings b
        ON b.ride_id = r.id
        AND (
          (
            r.driver_id = $2
            AND b.passenger_id = $3
          )
          OR
          (
            r.driver_id = $3
            AND b.passenger_id = $2
          )
        )

      WHERE r.id = $1

      ORDER BY b.id DESC
      LIMIT 1
      `,
      [rideId, userId, receiverId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const chat = result.rows[0];

    const validDriverPassengerPair =
      (Number(chat.driver_id) === Number(userId) &&
        Number(chat.passenger_id) === Number(receiverId)) ||
      (Number(chat.driver_id) === Number(receiverId) &&
        Number(chat.passenger_id) === Number(userId));

    if (!validDriverPassengerPair) {
      return null;
    }

    return chat;
  };

  // ============================================================
  // CALCULATE CHAT STATUS
  // ============================================================
  const calculateChatStatus = (chat) => {
    if (!chat) {
      return {
        chatAvailable: false,
        chatAvailableUntil: null,
        reason: "You do not have access to this chat.",
      };
    }

    // Normal active chat
    if (
      chat.ride_status !== "Cancelled" &&
      chat.booking_status === "Confirmed"
    ) {
      return {
        chatAvailable: true,
        chatAvailableUntil: null,
        reason: null,
      };
    }

    let cancellationTime = null;
    let reason = "Ride left";

    // ----------------------------------------------------------
    // Driver cancelled the ride
    // ----------------------------------------------------------
    if (chat.ride_status === "Cancelled") {
      if (chat.ride_cancelled_at) {
        cancellationTime = new Date(
          chat.ride_cancelled_at,
        ).getTime();
      }

      reason = "Ride cancelled";
    }

    // ----------------------------------------------------------
    // Passenger left the ride
    // ----------------------------------------------------------
    else if (
      chat.booking_status === "Cancelled" &&
      chat.booking_cancelled_at
    ) {
      cancellationTime = new Date(
        chat.booking_cancelled_at,
      ).getTime();

      reason = "Ride left";
    }

    if (!cancellationTime) {
      return {
        chatAvailable: false,
        chatAvailableUntil: null,
        reason,
      };
    }

    const chatAvailableUntil =
      cancellationTime + CHAT_GRACE_PERIOD_MS;

    const chatAvailable =
      Date.now() < chatAvailableUntil;

    return {
      chatAvailable,
      chatAvailableUntil: new Date(
        chatAvailableUntil,
      ).toISOString(),
      reason,
    };
  };

  // ============================================================
  // GET CHAT STATUS
  // ============================================================
  router.get(
    "/status/:rideId",
    verifyToken,
    async (req, res) => {
      try {
        const rideId = Number(req.params.rideId);
        const userId = Number(req.userId);
        const receiverId = Number(req.query.receiver);

        if (
          !Number.isSafeInteger(rideId) ||
          rideId <= 0 ||
          !Number.isSafeInteger(userId) ||
          userId <= 0 ||
          !Number.isSafeInteger(receiverId) ||
          receiverId <= 0
        ) {
          return res.status(400).json({
            message: "Invalid ride or user ID",
          });
        }

        if (userId === receiverId) {
          return res.status(400).json({
            message: "Invalid chat participants.",
          });
        }

        const chat = await getChatInfo(
          rideId,
          userId,
          receiverId,
        );

        if (!chat) {
          return res.status(403).json({
            message: "You do not have access to this chat.",
          });
        }

        const chatStatus = calculateChatStatus(chat);

        return res.json({
          chatAvailable: chatStatus.chatAvailable,
          chatAvailableUntil:
            chatStatus.chatAvailableUntil,
          reason: chatStatus.reason,
          rideStatus: chat.ride_status,
          bookingStatus: chat.booking_status,
        });
      } catch (error) {
        console.error(
          "Error checking chat status:",
          error,
        );

        return res.status(500).json({
          message: "Failed to check chat status",
        });
      }
    },
  );

  // ============================================================
  // GET MESSAGES FOR A RIDE + SPECIFIC DRIVER/PASSENGER PAIR
  // ============================================================
  router.get(
    "/:rideId",
    verifyToken,
    async (req, res) => {
      try {
        const rideId = Number(req.params.rideId);
        const userId = Number(req.userId);
        const receiverId = Number(req.query.receiver);

        if (
          !Number.isSafeInteger(rideId) ||
          rideId <= 0 ||
          !Number.isSafeInteger(userId) ||
          userId <= 0 ||
          !Number.isSafeInteger(receiverId) ||
          receiverId <= 0
        ) {
          return res.status(400).json({
            message: "Invalid ride or user ID",
          });
        }

        if (userId === receiverId) {
          return res.status(400).json({
            message: "Invalid chat participants.",
          });
        }

        // --------------------------------------------------------
        // Verify that this exact driver/passenger pair belongs
        // to this ride.
        //
        // Cancelled passengers can STILL read old messages.
        // --------------------------------------------------------
        const chat = await getChatInfo(
          rideId,
          userId,
          receiverId,
        );

        if (!chat) {
          return res.status(403).json({
            message:
              "You do not have access to this chat.",
          });
        }

        // --------------------------------------------------------
        // Get ONLY this conversation
        //
        // This is important:
        //
        // Ride #27 + Ved + Amit
        // is different from
        // Ride #38 + Ved + Amit
        //
        // Also prevents Driver A from seeing Passenger B's
        // messages on the same ride.
        // --------------------------------------------------------
        const result = await pool.query(
          `
          SELECT
            m.id,
            m.ride_id,
            m.sender_id,
            m.receiver_id,
            m.message,
            m.is_read,
            m.created_at,

            sender.name AS sender_name,
            receiver.name AS receiver_name

          FROM messages m

          JOIN users sender
            ON m.sender_id = sender.id

          JOIN users receiver
            ON m.receiver_id = receiver.id

          WHERE m.ride_id = $1

            AND (
              (
                m.sender_id = $2
                AND m.receiver_id = $3
              )
              OR
              (
                m.sender_id = $3
                AND m.receiver_id = $2
              )
            )

          ORDER BY m.created_at ASC
          `,
          [rideId, userId, receiverId],
        );

        return res.json(result.rows);
      } catch (error) {
        console.error(
          "Error fetching messages:",
          error,
        );

        return res.status(500).json({
          message: "Failed to fetch messages",
        });
      }
    },
  );

  // ============================================================
  // SEND MESSAGE
  // ============================================================
  router.post(
    "/",
    verifyToken,
    async (req, res) => {
      try {
        const {
          ride_id,
          receiver_id,
          message,
        } = req.body;

        const rideId = Number(ride_id);
        const senderId = Number(req.userId);
        const receiverId = Number(receiver_id);

        // --------------------------------------------------------
        // Validate IDs
        // --------------------------------------------------------
        if (
          !Number.isSafeInteger(rideId) ||
          !Number.isSafeInteger(senderId) ||
          !Number.isSafeInteger(receiverId) ||
          rideId <= 0 ||
          senderId <= 0 ||
          receiverId <= 0
        ) {
          return res.status(400).json({
            message: "Invalid ride or user ID",
          });
        }

        // --------------------------------------------------------
        // Prevent self-message
        // --------------------------------------------------------
        if (senderId === receiverId) {
          return res.status(400).json({
            message:
              "You cannot send a message to yourself.",
          });
        }

        // --------------------------------------------------------
        // Validate message
        // --------------------------------------------------------
        if (
          typeof message !== "string" ||
          message.trim().length === 0
        ) {
          return res.status(400).json({
            message: "Message cannot be empty.",
          });
        }

        // --------------------------------------------------------
        // Get exact chat information
        // --------------------------------------------------------
        const chat = await getChatInfo(
          rideId,
          senderId,
          receiverId,
        );

        if (!chat) {
          return res.status(403).json({
            message:
              "Only the driver and passenger can chat.",
          });
        }

        // --------------------------------------------------------
        // Check 10-minute chat grace period
        // --------------------------------------------------------
        const chatStatus =
          calculateChatStatus(chat);

        if (!chatStatus.chatAvailable) {
          return res.status(403).json({
            message:
              chatStatus.reason === "Ride cancelled"
                ? "Ride cancelled. Chat is no longer available for new messages."
                : "Ride left. Chat is no longer available for new messages.",
            chatAvailableUntil:
              chatStatus.chatAvailableUntil,
          });
        }

        // --------------------------------------------------------
        // INSERT MESSAGE
        // --------------------------------------------------------
        const result = await pool.query(
          `
          INSERT INTO messages
          (
            ride_id,
            sender_id,
            receiver_id,
            message
          )
          VALUES ($1, $2, $3, $4)

          RETURNING *
          `,
          [
            rideId,
            senderId,
            receiverId,
            message.trim(),
          ],
        );

        const chatMessage = result.rows[0];

        // --------------------------------------------------------
        // CREATE CHAT NOTIFICATION
        // --------------------------------------------------------
        const notificationResult =
          await pool.query(
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
              'NEW_MESSAGE',
              'New Message',
              (
                SELECT name
                FROM users
                WHERE id = $2
              ) || ' sent you a message: "' ||
              $3 ||
              '"',
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
              receiverId,
              senderId,
              message.trim(),
              rideId,
              chat.booking_id,
            ],
          );

        // --------------------------------------------------------
        // REAL-TIME MESSAGE
        // --------------------------------------------------------
        io.to(`user_${receiverId}`).emit(
          "new_message",
          {
            ...chatMessage,
          },
        );

        // --------------------------------------------------------
        // REAL-TIME NOTIFICATION
        // --------------------------------------------------------
        io.to(`user_${receiverId}`).emit(
          "new_notification",
          notificationResult.rows[0],
        );

        return res.status(201).json({
          message: "Message sent successfully",
          chatMessage,
        });
      } catch (error) {
        console.error(
          "Error sending message:",
          error,
        );

        return res.status(500).json({
          message: "Failed to send message",
        });
      }
    },
  );

  // ============================================================
  // MARK MESSAGE AS READ
  // ============================================================
  router.patch(
    "/:id/read",
    verifyToken,
    async (req, res) => {
      try {
        const messageId = Number(req.params.id);
        const userId = Number(req.userId);

        if (
          !Number.isSafeInteger(messageId) ||
          messageId <= 0
        ) {
          return res.status(400).json({
            message: "Invalid message ID",
          });
        }

        const result = await pool.query(
          `
          UPDATE messages
          SET is_read = TRUE

          WHERE id = $1
            AND receiver_id = $2

          RETURNING *
          `,
          [messageId, userId],
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            message: "Message not found.",
          });
        }

        return res.json({
          message: "Message marked as read",
          chatMessage: result.rows[0],
        });
      } catch (error) {
        console.error(
          "Error marking message as read:",
          error,
        );

        return res.status(500).json({
          message: "Failed to update message",
        });
      }
    },
  );

  return router;
}