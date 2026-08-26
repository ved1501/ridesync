import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt.js";

// Verifies the Authorization: Bearer <token> header.
// On success, attaches req.userId (the authenticated user's id) and calls next().
// On failure, responds with 401 and does NOT call next().
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required. Please log in.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.userId = decoded.userId;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired session. Please log in again.",
    });
  }
}
