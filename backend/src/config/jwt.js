// IMPORTANT: In production, set JWT_SECRET as an environment variable
// (e.g. in a .env file loaded via dotenv) instead of relying on the fallback below.
// The fallback exists only so the app runs out-of-the-box in local development.
export const JWT_SECRET = process.env.JWT_SECRET || "ridesync-dev-secret-change-me";

export const JWT_EXPIRES_IN = "7d";
