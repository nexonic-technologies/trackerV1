import crypto from "crypto";

// Strong random secret for signing JWT
export const generateSecret = () => {
  return crypto.randomBytes(64).toString("hex");
};

// Short unique ID for refresh token replay protection
export const generateJti = () => {
  return crypto.randomBytes(16).toString("hex");
};
