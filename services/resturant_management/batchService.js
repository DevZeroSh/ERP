const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const BatchModel = require("../../models/resturant_management/batchModel");
const RawMaterialModel = require("../../models/resturant_management/rawMaterialModel");
const stockSchema = require("../../models/stockModel");

// @desc Create Batch
// @route POST /api/Batch
// @access Private

exports.createBatch = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  req.body.companyId = companyId;
  const BatchData = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(BatchData.rawMaterialId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid rawMaterialId",
      });
    }

    const rawMaterial = await RawMaterialModel.findOneAndUpdate(
      { _id: BatchData.rawMaterialId, companyId },
      { $inc: { quantity: req.body.quantity, cost: req.body.buyingPrice } },
      { new: true }
    );

    if (!rawMaterial) {
      return res.status(404).json({
        status: false,
        message: "Raw Material not found",
      });
    }

    const Batch = await BatchModel.create(BatchData);

    res.status(201).json({
      status: true,
      message: "Batch inserted",
      data: Batch,
    });
  } catch (error) {
    console.error(`Error creating Batch: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

// @desc Get allBatches
// @route GET /api/Batch
// @access Private
exports.getAllBatches = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const pageSize = parseInt(req.query.limit);
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  try {
    const totalItems = await BatchModel.countDocuments({
      rawMaterialId: id,
      companyId,
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalItems / pageSize);
    // Fetch all Batches
    const Batch = await BatchModel.find({ rawMaterialId: id, companyId })
      .populate("stockId")
      .skip(skip)
      .limit(pageSize);

    // Respond with success message and data
    res.status(200).json({
      status: "true",
      message: "Batches fetched",
      results: Batch.length,
      Pages: totalPages,
      data: Batch,
    });
  } catch (error) {
    // Handle errors
    console.error(`Error fetching Batches: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
// @desc Get one Batch
// @route GET /api/Batch
// @access Private
exports.getOneBatch = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  try {
    const Batch = await BatchModel.findOne({
      _id: req.params.id,
      companyId,
    }).populate("stockId");

    if (!Batch) {
      return res.status(404).json({
        status: false,
        message: "Batch not found",
      });
    }

    res.status(200).json({
      status: "true",
      message: "Batch fetched",
      data: Batch,
    });
  } catch (error) {
    console.error(`Error fetching Batch: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
// @desc Update Batch
// @route PUT /api/Batch/:id
// @access Private
exports.updateBatch = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const BatchId = req.params.id;
  const updatedData = req.body;

  try {
    // Find and update the Batch
    const updatedBatch = await BatchModel.findOneAndUpdate(
      { _id: BatchId, companyId },
      updatedData,
      { new: true, runValidators: true }
    );

    // If the Batch is not found
    if (!updatedBatch) {
      return res.status(404).json({
        status: false,
        message: "Batch not found",
      });
    }

    // Respond with success message and updated data
    res.status(200).json({
      status: "true",
      message: "Batch updated",
      data: updatedBatch,
    });
  } catch (error) {
    // Handle errors
    console.error(`Error updating Batch: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
// @desc Delete Batch
// @route DELETE /api/Batch/:id
// @access Private
exports.deleteBatch = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const BatchId = req.params.id;

  try {
    // Find and delete the Batch
    const deletedBatch = await BatchModel.findOneAndDelete({
      _id: BatchId,
      companyId,
    });

    // If the Batch is not found
    if (!deletedBatch) {
      return res.status(404).json({
        status: false,
        message: "Batch not found",
      });
    }

    // Respond with success message
    res.status(200).json({
      status: "true",
      message: "Batch deleted",
    });
  } catch (error) {
    // Handle errors
    console.error(`Error deleting Batch: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
