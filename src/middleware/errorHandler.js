const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error:", err);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "خطای داخلی سرور رخ داده است"
        : err.message || "خطایی رخ داده است",
  });
};

module.exports = errorHandler;
