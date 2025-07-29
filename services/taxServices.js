const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const { default: slugify } = require("slugify");
const TaxModel = require("../models/taxModel");
const mongoose = require("mongoose");
const AccountingTreeSchema = require("../models/accountingTreeModel");
const currencySchema = require("../models/currencyModel");

//@desc Get list of tax
// @rout Get /api/tax
// @access priveta
exports.getTax = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const tax = await TaxModel.find({ companyId })
    .populate("salesAccountTax")
    .populate({
      path: "salesAccountTax",
      populate: { path: "currency" },
    })
    .populate("purchaseAccountTax")
    .populate({
      path: "purchaseAccountTax",
      populate: { path: "currency" },
    });
  res.status(200).json({ status: "true", results: tax.length, data: tax });
});

//@desc Create specific tax
// @rout Post /api/tax
// @access priveta
exports.createTax = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  req.body.slug = slugify(req.body.name);

  const tax = await TaxModel.create(req.body);
  res.status(201).json({ status: "true", message: "tax Inserted", data: tax });
});

//@desc get specific tax by id
// @rout Get /api/tax/:id
// @access priveta
exports.getOneTax = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const tax = await TaxModel.findOne({ _id: id, companyId })
    .populate("salesAccountTax")
    .populate("purchaseAccountTax");
  if (!tax) {
    return next(new ApiError(`No tax by this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: tax });
});

exports.updataTax = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  req.body.slug = slugify(req.body.name);
  req.body.companyId = companyId;
  const tax = await TaxModel.findByIdAndUpdate(
    { _id: req.params.id, companyId },
    req.body,
    {
      new: true,
    }
  );
  if (!tax) {
    return next(new ApiError(`No tax for this id ${req.params.id}`, 404));
  }
  res.status(200).json({ status: "true", message: "tax updated", data: tax });
});

//@desc Delete specific tax
// @rout Delete /api/tax/:id
// @access priveta
exports.deleteTax = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const tax = await TaxModel.findByIdAndDelete({ _id: id, companyId });
  if (!tax) {
    return next(new ApiError(`No tax by this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", message: "tax Deleted" });
});
