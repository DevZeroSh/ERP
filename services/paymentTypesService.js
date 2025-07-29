const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const PaymentTypesModel = require("../models/paymentTypesModel");

//@desc Get list of payment types
// @rout Get /api/paymenttype
// @access priveta
exports.getPaymentTypes = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const paymentType = await PaymentTypesModel.find({ companyId });
  res.status(200).json({ status: "true", data: paymentType });
});

//@desc Create payment type
//route Post /api/paymenttype
//@access Private
exports.createPaymentType = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  const paymentType = await PaymentTypesModel.create(req.body);

  res.status(200).json({
    status: "true",
    message: "Payment Inserted",
    data: paymentType,
  });
});

//@desc Get One payment type
//route Post /api/paymenttype
//@access Private
exports.getOnePaymentType = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const paymentType = await PaymentTypesModel.findById({ _id: id, companyId });
  if (!paymentType) {
    return next(
      new ApiError(`There is no payment type with this id ${id}`, 404)
    );
  } else {
    res.status(200).json({ status: "true", data: paymentType });
  }
});

//Update one Payment type
//route Put /api/paymenttype
//@access Private
exports.updataPaymentType = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const paymentType = await PaymentTypesModel.findOneAndUpdate(
    { _id: id, companyId },
    req.body,
    {
      new: true,
    }
  );

  if (!paymentType) {
    return next(
      new ApiError(`There is no payment type with this id ${id}`, 404)
    );
  } else {
    res.status(200).json({
      status: "true",
      message: "Payment type updated",
      data: paymentType,
    });
  }
});

// @desc Delete specific payment type
// @rout Delete /api/paymenttype/:id
// @access priveta
exports.deleteOnePaymentType = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const paymentType = await PaymentTypesModel.findOneAndDelete({
    _id: id,
    companyId,
  });

  if (!paymentType) {
    return next(new ApiError(`No payment type for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", message: "Payment type Deleted" });
});
