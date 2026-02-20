import type { Request, Response } from "express";

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const analysisRouter = require("./routes/analysis");
const errorHandler = require("./middleware/errorHandler");

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: "زیادی تلاش کردی! لطفاً بعداً امتحان کن.",
  standardHeaders: true,
  legacyHeaders: false,
});

const app = express();

app.use(cookieParser());
app.use(helmet());
app.use(limiter);
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(express.json({ limit: "30mb" }));

app.use(express.static(path.resolve(__dirname, "..", "public", "images")));

app.use(
  "/profiles",
  express.static(path.join(__dirname, "..", "uploads", "profiles")),
);

app.use("/api/analysis", analysisRouter);

app.use((req: Request, res: Response) => {
  console.log("This path is not found:", req.path);
  return res.status(404).json({
    message: "404! Path Not Found. Please double check the path / method",
  });
});

app.use(errorHandler);

module.exports = app;
