class ApiError extends Error {
  constructor(message, statsCode) {
    super(message);
    this.statsCode = statsCode;
    this.status = `${statsCode}`.startsWith(4) ? "fail" : "error";
    this.isOperational = true;
  }
}
module.exports = ApiError;
