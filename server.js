import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { setCookies } from "./src/Configs/index.js";
import { products } from "./src/LocalDb/products.js";
import { users } from "./src/LocalDb/users.js";
import {
  authenticateToken,
  requireAdmin,
  generateTokens,
} from "./src/Auth/index.js";

import dotenv from "dotenv";
import { Constants } from "./src/Constants/index.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

const corsOptions = {
  origin: [process.env.FRONTEND, process.env.FRONTEND2],
  credentials:true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser())


app.post("/auth/login", (req, res) => {
  const { username, password, keepLoggedIn } = req.body;

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const { accessToken, refreshToken } = generateTokens(user);

  res.cookie("accessToken", accessToken, {
    ...setCookies,
    maxAge: Constants.tokenCookieTime,
  });
  
  if (Boolean(keepLoggedIn)) {
    res.cookie("refreshToken", refreshToken, {
      ...setCookies,
      maxAge: Constants.refreshTokenCookieTime,
    });
  }

  const userInfo = {
      id: user.id,
      username: user.username,
      role: user.role,
    }

    res.cookie("userInfo", userInfo, {
      ...setCookies,
      maxAge: Constants.refreshTokenCookieTime, // it expires along with refresh token
    });

  


  res.json({
    user: userInfo,
  });
});

app.get("/products",authenticateToken, (req, res) => {
  let filteredProducts = [...products];

  res.status(200).json({products:filteredProducts});
});

app.post("/products", authenticateToken, requireAdmin, (req, res) => {
  const { name, price, category, description } = req.body;

  if (!name || !price || !category) {
    return res
      .status(400)
      .json({ error: "Name, price, and category are required" });
  }

  const newProduct = {
    id: products.length + 1,
    name,
    price: parseFloat(price),
    category,
    description: description || "",
  };

  products.push(newProduct);
  res.status(200).json(newProduct);
});

app.post("/logOut", (req, res) => {
  res.clearCookie("accessToken", {
    ...setCookies,
  });
   res.clearCookie("refreshToken", {
    ...setCookies,
  });
   res.clearCookie("userInfo", {
    ...setCookies,
  });
  res.status(200).send({ message: "Logged out" });
});

app.get("/", function (req, res) {
  res.send("<h1> hello backend </h1>");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
