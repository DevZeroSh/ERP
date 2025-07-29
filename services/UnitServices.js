const asyncHandler = require("express-async-handler");
const UnitModel = require("../models/UnitsModel");
const ApiError = require("../utils/apiError");
const { default: slugify } = require("slugify");
const mongoose = require("mongoose");

//@desc Get list of Unit
// @rout Get /api/unit
// @access priveta
exports.getUnits = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const unit = await UnitModel.find({ companyId });

  res.status(200).json({ status: "true", results: unit.length, data: unit });
});

//@desc Create specific Unit
// @rout Post /api/unit
// @access priveta
exports.createUnit = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  req.body.slug = slugify(req.body.name);
  const unit = await UnitModel.create(req.body);
  res
    .status(201)
    .json({ status: "true", message: "Unit Inserted", data: unit });
});

//@desc get specific Unit by id
// @rout Get /api/unit/:id
// @access priveta
exports.getUnit = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const unit = await UnitModel.findOne({ _id: id, companyId });
  if (!unit) {
    return next(new ApiError(`No unit by this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: unit });
});

exports.updataUnit = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const unit = await UnitModel.findOneAndUpdate(
    { _id: req.params.id, companyId },
    req.body,
    {
      new: true,
    }
  );
  if (!unit) {
    return next(new ApiError(`No unit for this id ${req.params.id}`, 404));
  }
  res.status(200).json({ status: "true", message: "unit updated", data: unit });
});

//@desc Delete specific Unit
// @rout Delete /api/unit/:id
// @access priveta
exports.deleteUnit = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  req.body.companyId = companyId;
  const { id } = req.params;
  const unit = await UnitModel.findOneAndDelete({ _id: id, companyId });

  if (!unit) {
    return next(new ApiError(`No Unit by this id ${id}`, 404));
  }

  res.status(200).json({ status: "true", message: "Unit Deleted" });
});
