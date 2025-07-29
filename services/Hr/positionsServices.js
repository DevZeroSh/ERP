const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");
const positionsModel = require("../../models/Hr/positionsModel");

exports.getAllPositions = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const positions = await positionsModel.find({ companyId }).lean();
  res
    .status(200)
    .json({ status: "success", results: positions.length, data: positions });
});

exports.getOnePositions = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  if (!req.params.id) {
    return next(
      new ApiError(`No Positions for this ID: ${req.params.id}`, 404)
    );
  }
  const positions = await positionsModel.findOne({
    _id: req.params.id,
    companyId,
  });
  res.status(200).json({ status: "success", data: positions });
});

exports.createPositions = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const positions = await positionsModel.create(req.body);
  res.status(200).json({ status: "success", data: positions });
});

exports.updatePositions = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  req.body.companyId = companyId;
  if (!id) {
    return next(new ApiError(`No Positions for this ID: ${id}`, 404));
  }
  const positions = await positionsModel.findOneAndUpdate(
    { _id: id, companyId },
    req.body,
    {
      new: true,
    }
  );

  res.status(200).json({ status: "success", data: positions });
});

exports.deletePositions = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  if (!id) {
    return next(new ApiError(`No Positions for this ID:${id}`, 404));
  }
  const positions = await positionsModel.findOneAndDelete({
    _id: id,
    companyId,
  });
  res.status(200).json({ status: "success", data: positions });
});
