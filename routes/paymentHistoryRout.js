const express = require("express");

const authService = require("../services/authService");
const { getPaymentHistory } = require("../services/paymentHistoryService");

const paymentHistoryRout = express.Router();
paymentHistoryRout.use(authService.protect);

paymentHistoryRout.route("/:id").get(getPaymentHistory);

module.exports = paymentHistoryRout;
