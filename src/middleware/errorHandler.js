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

// errorHandler.js
// const errorResponse = require('./errorResponse');

// const errorHandler = (err, req, res, next) => {
//   console.error(err); // برای لاگ داخل سرور
//   const statusCode = err.status || 500; // اگر خطای پیش‌بینی نشده بود، 500 بفرست
//   const message =
//     statusCode === 500
//       ? 'خطای داخلی سرور، لطفاً بعداً تلاش کنید.'
//       : err.message;

//   return errorResponse(res, statusCode, message);
// };

// module.exports = errorHandler;

// errorResponse.js
// const errorResponse = (res, statusCode, message, data = null) => {
//   return res.status(statusCode).json({
//     status: statusCode,
//     success: false,
//     error: message,
//     data,
//   });
// };

// module.exports = errorResponse;
