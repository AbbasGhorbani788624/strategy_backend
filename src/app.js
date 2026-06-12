const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");
const authRouter = require("./routes/auth");
const companyUserRouter = require("./routes/company/companyUserRoutes");
const profileRouter = require("./routes/profileRoutes");
const analysisRouter = require("./routes/analysisForm");
const projectRouter = require("./routes/projectRoutes");
const configRoutes = require("./routes/configRoutes");
const followupRoutes = require("./routes/followup");

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: "زیادی تلاش کردی! لطفاً بعداً امتحان کن.",
  standardHeaders: true,
  legacyHeaders: false,
});

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://185.237.85.53",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(limiter);
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(express.json({ limit: "30mb" }));

app.use(express.static(path.resolve(__dirname, "..", "public", "images")));

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/test", (req, res) => res.send("OK"));

app.use("/api/auth", authRouter);
app.use("/api/analysis", analysisRouter);
app.use("/api/companyuser", companyUserRouter);
app.use("/api/profile", profileRouter);
app.use("/api/project", projectRouter);
app.use("/api/config", configRoutes);
app.use("/api/follow-up", followupRoutes);

app.use((req, res) => {
  console.log("This path is not found:", req.path);
  return res.status(404).json({
    message: "404! مسیر یافت نشد. لطفاً مسیر/متد را دوباره بررسی کنید.",
  });
});

app.use(errorHandler);

module.exports = app;
