const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const purchaseRequestModel = require("../models/purchaseRequestModel");
const ApiError = require("../utils/apiError");
const { createInvoiceHistory } = require("./invoiceHistoryService");
const invoiceHistoryModel = require("../models/invoiceHistoryModel");
const emoloyeeShcema = require("../models/employeeModel");
const TaxSchema = require("../models/taxModel");

exports.getAllPurchaseRequest = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const filters = req.query?.filters ? JSON.parse(req.query?.filters) : {};
  const pageSize = parseInt(req.query.limit) || 0;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  let query = { companyId };

  // Date filter
  if (filters?.startDate || filters?.endDate) {
    query.date = {};
    if (filters?.startDate) query.date.$gte = filters.startDate;
    if (filters?.endDate) query.date.$lte = filters.endDate;
  }

  // Tags filter
  if (filters?.tags?.length) {
    const tagIds = filters.tags.map((tag) => tag.id);
    query["tag.id"] = { $in: tagIds };
  }

  // Payment status
  if (filters.paymentStatus !== undefined) {
    query.paid = filters.paymentStatus;
  }
  if (filters?.filterTags?.length) {
    query["tag.name"] = { $in: filters.filterTags };
  }
  // Employee filter
  if (filters.employee) {
    query.employee = filters.employee;
  }

  // Supplier name filter
  if (filters?.businessPartners) {
    query["supllier.name"] = {
      $regex: filters.businessPartners,
      $options: "i",
    };
  }

  // Keyword search
  if (req.query.keyword) {
    query.$or = [
      { invoiceName: { $regex: req.query.keyword, $options: "i" } },
      { counter: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  // Pagination and sorting
  const totalItems = await purchaseRequestModel.countDocuments(query);
  const totalPages = Math.ceil(totalItems / pageSize);

  const purchaseRequests = await purchaseRequestModel
    .find(query)
    .sort({ registryDate: -1 })
    .skip(skip)
    .limit(pageSize)
    .populate({
      path: "employee",
      select: "name profileImg email phone",
    });
  res.status(200).json({
    status: "success",
    page: totalPages,
    data: purchaseRequests,
  });
});

exports.getPurchaseRequestById = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const purchaseRequest = await purchaseRequestModel
    .findOne({ _id: id, companyId })
    .populate("invoicesItems.tax");
  if (!purchaseRequest) {
    return next(new ApiError(`Purchase Request not found ${id}`, 404));
  }
  const pageSize = req.query.limit || 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  const totalItems = await invoiceHistoryModel.countDocuments({
    invoiceId: id,
    companyId,
  });

  const totalPages = Math.ceil(totalItems / pageSize);
  const invoiceHistory = await invoiceHistoryModel
    .find({
      invoiceId: id,
      companyId,
    })
    .populate({ path: "employeeId", select: "name email" })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    status: "success",
    data: purchaseRequest,
    Pages: totalPages,
    history: invoiceHistory,
  });
});

exports.createCashPurchaseRequest = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  req.body.companyId = companyId;
  req.body.employee = req.user._id;
  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }
  const ts = Date.now();

  const futureDateOb = new Date(ts);
  futureDateOb.setSeconds(futureDateOb.getSeconds());
  const formattedDateAdd3 = `${padZero(futureDateOb.getHours())}:${padZero(
    futureDateOb.getMinutes()
  )}:${padZero(futureDateOb.getSeconds())}.${padZero(
    futureDateOb.getMilliseconds(),
    3
  )}`;
  const registryDate = `${req.body.registryDate}T${formattedDateAdd3}Z`;
  const deliveryDate = `${req.body.deliveryDate}T${formattedDateAdd3}Z`;
  req.body.registryDate = registryDate;
  req.body.deliveryDate = deliveryDate;

  const invoicesItems = req.body.invoicesItems;

  if (!invoicesItems || invoicesItems.length === 0) {
    return next(new ApiError("The cart is empty", 400));
  }

  const nextCounter =
    (await purchaseRequestModel.countDocuments({ companyId })) + 1;
  req.body.counter = nextCounter;
  req.body.admin = req.user.name;

  const purchaseRequest = await purchaseRequestModel.create(req.body);

  createInvoiceHistory(
    companyId,
    purchaseRequest._id,
    "create",
    req.user._id,
    req.body.registryDate
  );
  res.status(201).json({ status: "success", data: purchaseRequest });
});

exports.updatePurchaseRequest = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  req.body.companyId = companyId;
  const ts = Date.now();
  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }
  const futureDateOb = new Date(ts);
  futureDateOb.setSeconds(futureDateOb.getSeconds());
  const formattedDateAdd3 = `${padZero(futureDateOb.getHours())}:${padZero(
    futureDateOb.getMinutes()
  )}:${padZero(futureDateOb.getSeconds())}.${padZero(
    futureDateOb.getMilliseconds(),
    3
  )}`;
  if (req.body.registryDate && req.body.deliveryDate) {
    const registryDate = `${req.body.registryDate}T${formattedDateAdd3}Z`;
    const deliveryDate = `${req.body.deliveryDate}T${formattedDateAdd3}Z`;
    req.body.registryDate = registryDate;
    req.body.deliveryDate = deliveryDate;
  }

  const { id } = req.params;

  const purchaseRequest = await purchaseRequestModel.findOneAndUpdate(
    { _id: id, companyId },
    req.body,
    { new: true }
  );

  if (!purchaseRequest) {
    return next(new ApiError(`not Update this id ${id}`, 500));
  }
  await createInvoiceHistory(
    companyId,
    id,
    "edit",
    req.user._id,
    new Date().toISOString()
  );
  res.status(201).json({ status: "success", data: purchaseRequest });
});
