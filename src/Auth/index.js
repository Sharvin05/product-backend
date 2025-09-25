import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
import { users } from "../LocalDb/users.js";
import { Constants } from "../Constants/index.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const tokenTime = '8h';
const refreshTokenTime = "24h";


function generateToken(userData, expiresIn , secret) {
  const token = jwt.sign(
    { id: userData.id, username: userData?.username, role: userData?.role },
    secret,
    { expiresIn }
  );

  return token;
}

function generateTokens(userData) {
  const accessToken = generateToken(userData, tokenTime, JWT_SECRET);
  const refreshToken = generateToken(
    { id: userData.id },
    refreshTokenTime,
    JWT_REFRESH_SECRET
  );
  return { accessToken, refreshToken };
}

const getUserById = (userId) => {
  // Fetch user from database by ID
  return users.find((u) => u.id === userId);
};

const authenticateToken = (req, res, next) => {

  let accessToken = req.cookies.accessToken;
  let refreshToken = req.cookies.refreshToken;


  const isServer = req.headers.serverside;
  if (Boolean(isServer)) {
    accessToken = req.headers.accesstoken;    
    refreshToken = req.headers.refreshtoken;
  }

  // Try to verify access token first
  try {
    if (accessToken) {
      const decoded = jwt.verify(accessToken, JWT_SECRET);
      req.user = decoded;
      return next();
    }
  } catch (error) {
    console.log("Access token invalid, attempting refresh...");
  }

  // Access token missing/invalid - try refresh token
  if (!refreshToken) {
    return res.status(401).json({ error: "No tokens provided" });
  }

  

  try {

    // Verify refresh token
    const refreshDecoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Generate new tokens
    const foundUser = getUserById(refreshDecoded.id);
    
    const { newAccessToken, newRefreshToken } = generateTokens(foundUser);

    // Set tokens
    res.status(200).cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: Constants.refreshTokenCookieTime,
    });

    res.status(200).cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: true,
      maxAge: Constants.tokenCookieTime,
    });

    req.user = foundUser;
    req.tokenRefreshed = true;

    next();
  } catch (error) {
    return res.status(401).json({ error: "Authentication failed" });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

export { authenticateToken, requireAdmin, generateTokens };
