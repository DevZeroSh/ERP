const asyncHandler = require("express-async-handler");
const { default: mongoose } = require("mongoose");
const pageModel = require("../../models/ecommerce/pageModel");
const ApiError = require("../../utils/apiError");

exports.createPage = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const page = await pageModel.create(req.body);

  res.status(200).json({
    status: "true",
    message: "page Inserted",
    data: page,
  });
});

exports.getPage = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const page = await pageModel.find({ companyId });

  res.status(200).json({
    status: "true",

    data: page,
  });
});

exports.getOnePage = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const page = await pageModel.findOne({ _id: id, companyId });

  if (!page) {
    return next(new ApiError(`There is no page with this id ${id}`, 404));
  }

  res.status(200).json({
    status: "true",
    data: page,
  });
});

exports.updatePage = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const { id } = req.params;

  const page = await pageModel.findOneAndUpdate(
    { _id: id, companyId },
    req.body,
    {
      new: true,
    }
  );

  res.status(200).json({
    status: "true",

    data: page,
  });
});
