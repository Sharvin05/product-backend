import dotenv from "dotenv";
dotenv.config();

export const setCookies = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "None",
};
