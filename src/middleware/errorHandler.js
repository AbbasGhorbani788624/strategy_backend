const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error:", err);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;

  const payload = {
    status: statusCode,
    success: false,
    message:
      statusCode === 500
        ? "خطای داخلی سرور رخ داده است"
        : err.message || "خطایی رخ داده است",
  };

  if (err.code) {
    payload.code = err.code;
  }

  if (err.data !== undefined && err.data !== null) {
    payload.data = err.data;
  }

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;

