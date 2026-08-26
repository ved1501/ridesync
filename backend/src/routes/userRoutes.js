import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/jwt.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

const SALT_ROUNDS = 10;

// REGISTER USER
router.post("/", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters.",
      });
    }

    // Check existing email
    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
      `,
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: "An account with this email already exists.",
      });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const result = await pool.query(
      `
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at
      `,
      [name, email, hashedPassword]
    );

    res.status(201).json({
      message: "Registration successful!",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error registering user:", error);

    res.status(500).json({
      message: "Failed to register user",
    });
  }
});


// LOGIN USER
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const result = await pool.query(
      `
      SELECT id, name, email, password
      FROM users
      WHERE LOWER(email) = LOWER($1)
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const userRow = result.rows[0];

    const passwordMatches = await bcrypt.compare(password, userRow.password);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign({ userId: userRow.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.json({
      message: "Login successful!",
      token,
      user: {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error);

    res.status(500).json({
      message: "Failed to login user",
    });
  }
});


// UPDATE PROFILE
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    // A user can only update their own profile
    if (userId !== req.userId) {
      return res.status(403).json({
        message: "You can only update your own profile.",
      });
    }

    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message: "Name and email are required",
      });
    }

    // Check the new email isn't already used by a different account
    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
      AND id != $2
      `,
      [email, userId],
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: "An account with this email already exists.",
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET name = $1, email = $2
      WHERE id = $3
      RETURNING id, name, email, created_at
      `,
      [name, email, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "Profile updated successfully!",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating profile:", error);

    res.status(500).json({
      message: "Failed to update profile",
    });
  }
});


export default router;
