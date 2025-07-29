const asyncHandler = require("express-async-handler");
const paymentMethodModel = require("../../models/ecommerce/ecommercePaymentMethodModel");
const ApiError = require("../../utils/apiError");
const mongoose = require("mongoose");

// Get all payment methods
exports.getPaymentMethods = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const paymentMethods = await paymentMethodModel.find({ companyId });

  res.status(200).json({
    status: "success",
    results: paymentMethods.length,
    data: paymentMethods,
  });
});

// Get specific payment method by ID
exports.getPaymentMethod = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const paymentMethod = await paymentMethodModel.findOne({
    _id: id,
    companyId,
  });

  if (!paymentMethod) {
    return next(new ApiError(`No payment method found for ID ${id}`, 404));
  }
  res.status(200).json({ status: "success", data: paymentMethod });
});

// Update specific payment method
exports.updatePaymentMethod = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const id = req.params.id;

  let paymentMethod = await paymentMethodModel.findOneAndUpdate(
    {
      _id: id,
      companyId,
    },
    {
      companyId: req.body.companyId,
      status: paymentMethod.status,
      extraCharge: paymentMethod.extraCharge,
      minAmount: paymentMethod.minAmount,
      maxAmount: paymentMethod.maxAmount,
      desc: paymentMethod.description,
      ibanNumber: paymentMethod.ibanNumber,
      ibanName: paymentMethod.ibanName,
      bankName: paymentMethod.bankName,
      companyRatio: paymentMethod.companyRatio,
    },
    { new: true }
  );
  if (!paymentMethod) {
    return next(new ApiError(`No payment method found for ID ${id}`, 404));
  }
  res.status(200).json({
    status: "success",
    message: "Payment Method updated",
    data: paymentMethod,
  });
});
