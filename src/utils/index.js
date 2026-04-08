const createBadRequestError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode || 400;
  throw err;
};

module.exports = { createBadRequestError };
