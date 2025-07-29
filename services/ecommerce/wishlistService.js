const asyncHandler = require("express-async-handler");
const UserModel = require("../../models/ecommerce/E_user_Modal");
const productModel = require("../../models/productModel");


// @desc    Add product to wishlist
// @route   POST /api/wishlist
// @access  Protected/User
exports.addProductToWishlist = asyncHandler(async (req, res, next) => {
  try {
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const product = await productModel.findOne({
      _id: req.body.productId,
      companyId,
    });
    if (!product) {
      return res.status(404).json({
        status: "fail",
        message: "Product not found.",
      });
    }

    product.addToFavourites = (product.addToFavourites || 0) + 1;
    await product.save();

    const user = await UserModel.findOneAndUpdate(
      { _id: req.user._id, companyId },
      { $addToSet: { wishlist: req.body.productId } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Product added successfully to your wishlist.",
      data: user.wishlist,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Protected/User
exports.removeProductFromWishlist = asyncHandler(async (req, res, next) => {
  try {
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const product = await productModel.findOne({
      _id: req.params.productId,
      companyId,
    });
    if (!product) {
      return res.status(404).json({
        status: "fail",
        message: "Product not found.",
      });
    }

    // Decrease the addToFavourites field by one
    product.addToFavourites = Math.max((product.addToFavourites || 0) - 1, 0);
    await product.save();

    const user = await UserModel.findOneAndUpdate(
      { _id: req.user._id, companyId },
      {
        $pull: { wishlist: req.params.productId },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Product removed successfully from your wishlist.",
      data: user.wishlist,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get logged user wishlist
// @route   GET /api/wishlist
// @access  Protected/User
exports.getLoggedUserWishlist = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const user = await UserModel.findOne({
    _id: req.user._id,
    companyId,
  }).populate({
    path: "wishlist",
    populate: {
      path: "currency",
      model: CurrencyModel,
    },
  });

  res.status(200).json({
    status: "success",
    results: user.wishlist.length,
    data: user.wishlist,
  });
});
