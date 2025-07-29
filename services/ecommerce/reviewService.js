const { default: mongoose } = require("mongoose");
const reviewModel = require("../../models/ecommerce/reviewModel");
const asyncHandler = require("express-async-handler");
const productModel = require("../../models/productModel");

const ApiError = require("../../utils/apiError");

//@desc Get list of reviews
//@route GEt /api/review
//@accsess public
exports.getReviews = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const review = await reviewModel.find({ companyId });
  res
    .status(200)
    .json({ status: "success", results: review.length, data: review });
});

//@desc Get list of review
//@route GEt /api/review/:id
//@accsess public
exports.getOneReview = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const review = await reviewModel.findOne({ _id: id, companyId });
  if (!id) {
    return next(new ApiError(`No Brand found for id ${id}`, 404));
  }
  res
    .status(200)
    .json({ status: "success", results: review.length, data: review });
});

exports.getOneReviewByUser = asyncHandler(async (req, res, next) => {
  try {
    const { productId } = req.params;
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }
    // Validate required inputs

    if (!productId) {
      return res.status(400).json({ message: "Missing parameter: productId" });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    // Query the review
    const review = await reviewModel.findOne({
      customar: req.user.id,
      product: productId,
      companyId,
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    return res.status(200).json({ message: "success", data: review });
  } catch (error) {
    console.error("Error fetching user review:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

//@desc Post list of review
//@route Post /api/review/:id
//@accsess public
exports.createReview = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  try {
    const review = await reviewModel.create(req.body);

    const [result] = await reviewModel.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(req.body.product),
          companyId,
        },
      },
      {
        $group: {
          _id: "$product",
          avgRatings: { $avg: "$rating" },
          ratingsQuantity: { $sum: 1 },
        },
      },
    ]);

    const updateData = result
      ? {
          ratingsAverage: result.avgRatings,
          ratingsQuantity: result.ratingsQuantity,
        }
      : { ratingsAverage: 0, ratingsQuantity: 0 };

    await productModel.findOneAndUpdate(
      { _id: req.body.product, companyId },
      updateData
    );

    res.status(200).json({ status: "success", data: review });
  } catch (error) {
    next(error);
  }
});

//@desc Put list of review
//@route Put /api/review/:id
//@accsess public
exports.updateReview = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const review = await reviewModel.findOneAndUpdate(
    { _id: req.params.id, companyId },
    req.body,
    {
      new: true,
    }
  );
  if (!review) {
    return next(new ApiError(`No Brand found for id ${req.params.id}`, 404));
  }
  res
    .status(200)
    .json({ status: "success", results: review.length, data: review });
});

//@desc delete list of review
//@route delete /api/review/:id
//@accsess public
exports.deleteReview = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;

  const review = await reviewModel.findOneAndDelete({ _id: id, companyId });
  if (!review) {
    return next(new ApiError(`No Brand found for id ${req.params.id}`, 404));
  }
  res.status(200).json({ status: "success", message: "review Deleted" });
});

exports.getReviewsByProduct = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const limit = parseInt(req.query.limit) || 20;
  const skip = parseInt(req.query.skip) || 0;
  const { id } = req.params;

  try {
    let productQuery = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id, companyId }
      : { slug: id, companyId };

    const product = await productModel.findOne(productQuery);

    if (!product) {
      return next(ApiError(`Product not found with ID/Slug: ${id}`, 404));
    }

    // Count reviews
    const totalItems = await reviewModel.countDocuments({
      product: product._id,
      companyId,
    });

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalItems / limit);

    // Fetch the reviews with pagination
    const reviews = await reviewModel
      .find({ product: product._id, companyId })
      .skip(skip)
      .limit(limit);

    if (!reviews || reviews.length === 0) {
      return next(ApiError(`No reviews found for product ${id}`, 404));
    }

    // Return the paginated results along with pagination info
    res.status(200).json({
      status: "success",
      results: reviews.length,
      data: reviews,
      pagination: {
        currentPage: Math.floor(skip / limit) + 1,
        totalPages,
        totalItems,
        limit,
      },
    });
  } catch (error) {
    console.log(`error`, error);

    return next(new ApiError("Internal Server Error", 500));
  }
});
