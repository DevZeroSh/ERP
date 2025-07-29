const { default: mongoose } = require("mongoose");
const asyncHandler = require("express-async-handler");
const quotationModel = require("../models/quotationsModel.js");
const { Search } = require("../utils/search.js");
const ApiError = require("../utils/apiError");

exports.createCashQuotation = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  req.body.companyId = companyId;
  const nextCounter = (await quotationModel.countDocuments({ companyId })) + 1;
  req.body.counter = nextCounter;
  const quotation = await quotationModel.create(req.body);
  if (!quotation) {
    return next(new ApiError("The cart is empty", 400));
  }
  res.status(201).json({ status: "success", data: quotation });
});

exports.getAllQuotations = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const filters = req.query?.filters ? JSON.parse(req.query.filters) : {};

  const pageSize = parseInt(req.query.limit) || 0;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  let query = { companyId };

  // Date Range
  if (filters?.startDate || filters?.endDate) {
    query.startDate = {};
    if (filters.startDate) query.startDate.$gte = filters.startDate;
    if (filters.endDate) query.startDate.$lte = filters.endDate;
  }

  // Payment Status
  if (filters.paymentStatus) {
    query.status = filters.paymentStatus;
  }

  // Employee
  if (filters.employee) {
    query.employee = filters.employee;
  }

  // Tags
  if (filters?.tags?.length) {
    const tagIds = filters.tags.map((tag) => tag.id);
    query["tag.id"] = { $in: tagIds };
  }

  // Business Partner
  if (filters?.businessPartners) {
    query["customer.name"] = {
      $regex: filters.businessPartners,
      $options: "i",
    };
  }
  if (filters?.filterTags?.length) {
    query["tag.name"] = { $in: filters.filterTags };
  }
  // Keyword Search
  if (req.query.keyword) {
    query.$or = [
      { counter: { $regex: req.query.keyword, $options: "i" } },
      { invoiceName: { $regex: req.query.keyword, $options: "i" } },
      { "customer.name": { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  // Query with pagination and sorting
  const mongooseQuery = quotationModel
    .find(query)
    .sort({ startDate: -1 })
    .skip(skip)
    .limit(pageSize);

  const [quotations, totalItems] = await Promise.all([
    mongooseQuery,
    quotationModel.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalItems / pageSize);

  res.status(200).json({
    status: "success",
    totalPages,
    results: quotations.length,
    data: quotations,
  });
});

exports.getQuotationById = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const quotation = await quotationModel.findOne({
    _id: req.params.id,
    companyId,
  });

  if (!quotation) {
    return next(new ApiError("Quotation not found", 404));
  }

  res.status(200).json({ status: "success", data: quotation });
});

exports.updateQuotation = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;

  const quotation = await quotationModel.findByIdAndUpdate(
    { _id: id, companyId },
    req.body,
    {
      new: true,
    }
  );

  if (!quotation) {
    return next(new ApiError(`not Update this id ${id}`, 500));
  }

  res.status(201).json({ status: "success", data: quotation });
});
