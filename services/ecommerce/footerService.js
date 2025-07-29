const asyncHandler = require("express-async-handler");
const { default: mongoose } = require("mongoose");
const footerModel = require("../../models/ecommerce/footerModel");
const ApiError = require("../../utils/apiError");

exports.addFooters = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const footer = await footerModel.create(req.body);

  res.status(200).json({
    status: "success",
    message: "Inserted",
    data: footer,
  });
});

exports.getFooters = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const footer = await footerModel.find({ companyId });
  res.status(200).json({
    status: "success",
    results: footer.length,
    data: footer,
  });
});

exports.getFooter = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const footer = await footerModel.findOne({ _id: id, companyId });
  if (!footer) {
    return next(new ApiError(`Not fund footer as this Id ${id}`));
  }
  res.status(200).json({
    status: "success",
    data: footer,
  });
});

exports.updateFooter = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const { id } = req.params;
  const footer = await footerModel.findByIdAndUpdate(
    { _id: id, companyId },
    req.body,
    {
      new: true,
    }
  );
  if (!footer) {
    return next(new ApiError(`Not fond for this id ${id}`));
  }
  res.status(200).json({
    status: "success",
    message: "updated",
    data: footer,
  });
});

exports.deleteFooter = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const footer = await footerModel.findOneAndDelete({ _id: id, companyId });
  if (!footer) {
    return next(new ApiError(`Not fond for this id ${id}`));
  }
  res.status(200).json({
    status: "success",
    message: "footer has been deleted",
  });
});
