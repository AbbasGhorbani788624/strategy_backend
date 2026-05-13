const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");
const companyRoutes = require("./routes/superAdmin/companyRoutes");
const authRouter = require("./routes/auth");
const companyUserRouter = require("./routes/company/companyUserRoutes");
const profileRouter = require("./routes/profileRoutes");
const analysisFormRoutes = require("./routes/superAdmin/analysisFormRoutes");
const stepFlow = require("./routes/superAdmin/stepFlow");
const analysisRouter = require("./routes/analysisForm");
const companyAdmin = require("./routes/superAdmin/companyAdmin");
const projectRouter = require("./routes/projectRoutes");
const configRoutes = require("./routes/configRoutes");

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: "زیادی تلاش کردی! لطفاً بعداً امتحان کن.",
  standardHeaders: true,
  legacyHeaders: false,
});

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// بقیه کدهای شما مثل middlewareها
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(limiter);
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(express.json({ limit: "30mb" }));

app.use(express.static(path.resolve(__dirname, "..", "public", "images")));

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/auth", authRouter);
app.use("/api/company", companyRoutes);
app.use("/api/analysis", analysisRouter);
app.use("/api/companyuser", companyUserRouter);
app.use("/api/profile", profileRouter);
app.use("/api/analysis-forms", analysisFormRoutes);
app.use("/api/stepflow", stepFlow);
app.use("/api/admin-data", companyAdmin);
app.use("/api/project", projectRouter);
app.use("/api/config", configRoutes);

app.use((req, res) => {
  console.log("This path is not found:", req.path);
  return res.status(404).json({
    message: "404! مسیر یافت نشد. لطفاً مسیر/متد را دوباره بررسی کنید.",
  });
});

app.use(errorHandler);

module.exports = app;
