const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const mongoose = require("mongoose");
const UnTracedproductLogModel = require("../models/unTracedproductLogModel");
const { Search } = require("../utils/search");

//@desc Get list of UnTracedproductLog
// @rout Get /api/untracedproductlog
// @access priveta
exports.getUnTracedproductLog = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const pageSize = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let query = { companyId: companyId };
  if (req.query.keyword) {
    query.$or = [{ name: { $regex: req.query.keyword, $options: "i" } }];
  }
  const totalItems = await UnTracedproductLogModel.countDocuments(query);
  const totalPages = Math.ceil(totalItems / pageSize);
  const UnTracedproductLog = await UnTracedproductLogModel.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    status: "true",
    totalPages: totalPages,
    results: totalItems,
    data: UnTracedproductLog,
  });
});

//@desc Create specific UnTracedproductLog
// @rout Post /api/untracedproductlog
// @access priveta
exports.createUnTracedproductLog = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const UnTracedproductLog = await UnTracedproductLogModel.create(req.body);
  res.status(201).json({
    status: "true",
    message: "UnTracedproductLog Inserted",
    data: UnTracedproductLog,
  });
});

//@desc get specific UnTracedproductLog by id
// @rout Get /api/untracedproductlog/:id
// @access priveta
exports.getOneUnTracedproductLog = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const UnTracedproductLog = await UnTracedproductLogModel.findOne({
    _id: id,
    companyId,
  });
  if (!UnTracedproductLog) {
    return next(new ApiError(`No UnTracedproductLog by this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: UnTracedproductLog });
});

exports.updataUnTracedproductLog = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const UnTracedproductLog = await UnTracedproductLogModel.findOneAndUpdate(
    { _id: req.params.id, companyId },
    req.body,
    {
      new: true,
    }
  );
  if (!UnTracedproductLog) {
    return next(
      new ApiError(`No UnTracedproductLog for this id ${req.params.id}`, 404)
    );
  }
  res.status(200).json({
    status: "true",
    message: "UnTracedproductLog updated",
    data: UnTracedproductLog,
  });
});

//@desc Delete specific UnTracedproductLog
// @rout Delete /api/untracedproductlog/:id
// @access priveta
exports.deleteUnTracedproductLog = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const UnTracedproductLog = await UnTracedproductLogModel.findOneAndDelete({
    _id: id,
    companyId,
  });

  if (!UnTracedproductLog) {
    return next(new ApiError(`No UnTracedproductLog by this id ${id}`, 404));
  }

  res
    .status(200)
    .json({ status: "true", message: "UnTracedproductLog Deleted" });
});
