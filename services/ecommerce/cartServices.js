const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");
const productModel = require("../../models/productModel");
const CouponModel = require("../../models/discountModel");
const CartModel = require("../../models/ecommerce/cartModel");
const { getParasutOneProduct } = require("../parasut/parasutServices");

const calclatTotalCartPrice = (cart) => {
  return cart.cartItems.reduce((total, item) => {
    const itemPrice =
      item?.ecommercePriceMainCurrency > 0
        ? item?.ecommercePriceMainCurrency
        : item.taxPrice;

    return total + item.quantity * itemPrice;
  }, 0); // Initial total is 0
};

const calclatTotalCartPriceAfterDiscont = (coupon, cart) => {
  let totalPriceAfterDiscount;
  let totalPrice = cart.totalCartPrice;
  if (coupon.discountType === "Percentages") {
    totalPriceAfterDiscount = (
      totalPrice -
      (totalPrice * coupon.quantity) / 100
    ).toFixed(2);
  } else {
    totalPriceAfterDiscount = (totalPrice - coupon.quantity).toFixed(2);
  }
  cart.totalPriceAfterDiscount = totalPriceAfterDiscount;
};

//@desc Add product to Cart
//@route GEt /api/cart
//@accsess private/User
exports.addProductToCart = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { qr, quantity, taxRate, tax, user } = req.body;
  const token = req.headers["x-anonymous-token"];
  const customarID = user || null;

  const product = await productModel.findOne({ qr: qr, companyId });
  if (!product) {
    return res.status(404).json({
      status: "Error",
      message: "Product not found with the provided QR code.",
    });
  }

  const taxPrice =
    product.ecommercePriceAftereDiscount > 0
      ? product.ecommercePriceAftereDiscount
      : product?.ecommercePriceMainCurrency > 0
      ? product?.ecommercePriceMainCurrency
      : product.ecommercePrice;

  let cart = await CartModel.findOne(
    customarID != null && customarID != undefined
      ? { customar: customarID, companyId }
      : { token }
  ).populate("cartItems.product");

  // Fetch stock count from Parasut API
  let maxQuantity;
  if (product?.parasutID?.length > 5) {
    const parasutProduct = await getParasutOneProduct(product?.parasutID);
    maxQuantity = parasutProduct?.data?.attributes?.stock_count || 0;
  }

  if (!cart) {
    if (quantity > maxQuantity) {
      return res.status(400).json({
        status: "Error",
        message: "Cannot add more than available stock",
      });
    }

    cart = new CartModel({
      customar: customarID,
      token: token || undefined,
      cartItems: [
        {
          product: product._id,
          taxPrice: taxPrice,
          name: product.name,
          qr: product.qr,
          quantity,
          taxRate,
          ecommercePriceMainCurrency: product.ecommercePriceMainCurrency,
          price: product.ecommercePriceBeforeTax,
          image: product.image,
          maxQuantity: maxQuantity,
          tax,
          profitRatio: product.profitRatio,
        },
      ],
      companyId,
    });
  } else {
    const productIndex = cart.cartItems.findIndex(
      (item) => item.qr === product.qr
    );

    if (productIndex > -1) {
      const newQuantity = cart.cartItems[productIndex].quantity + quantity;
      if (newQuantity > maxQuantity) {
        return res.status(400).json({
          status: "Error",
          message: "Cannot add more than available stock",
        });
      }
      cart.cartItems[productIndex].quantity = newQuantity;
    } else {
      if (quantity > maxQuantity) {
        return res.status(400).json({
          status: "Error",
          message: "Cannot add more than available stock",
        });
      }
      cart.cartItems.push({
        product: product._id,
        taxPrice: taxPrice,
        name: product.name,
        qr: product.qr,
        quantity,
        taxRate,
        ecommercePriceMainCurrency: product.ecommercePriceMainCurrency,
        price: product.ecommercePriceBeforeTax,
        image: product.image,
        maxQuantity: maxQuantity,
        tax,
        profitRatio: product.profitRatio,
      });
    }
  }

  // Calculate totalCartPrice and totalPriceAfterDiscount
  cart.totalCartPrice = calclatTotalCartPrice(cart);

  if (cart.coupon) {
    const coupon = await CouponModel.findOne({
      discountName: cart.coupon,
      companyId,
    });
    cart.totalPriceAfterDiscount = calclatTotalCartPriceAfterDiscont(
      coupon,
      cart
    );
  } else {
    cart.totalPriceAfterDiscount = cart.totalCartPrice;
  }

  await cart.save();
  cart = await CartModel.findById(cart._id).populate("cartItems.product");

  res.status(200).json({
    status: "Success",
    numberCartItems: cart.cartItems.length,
    message: "Product added to cart successfully",
    data: cart,
  });
});

//@desc Get logged user Cart
//@route Get /api/cart
//@accsess private/User
exports.getLoggedUserCart = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const token = req.headers["x-anonymous-token"];

  const cart = await CartModel.findOne(
    req.user ? { customar: req.user._id, companyId } : { token, companyId }
  ).populate({
    path: "cartItems.product",
    populate: { path: "tax" },
  });

  res.status(200).json({
    status: "success",
    numOfCartItems: cart?.cartItems?.length || 0,
    data: cart || [],
  });
});

//@desc Remove specific Cart item
//@route Delete /api/cart:itemId
//@accsess private/User
exports.removeSpecifcCartItem = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const token = req.headers["x-anonymous-token"];
  const customarID = req?.user?._id;

  const cart = await CartModel.findOneAndUpdate(
    req.user ? { customar: customarID, companyId } : { token, companyId },
    { $pull: { cartItems: { product: req.params.itemId } } },
    { new: true }
  );

  if (!cart) {
    return next(new ApiError(`There is no cart for this user or token`, 404));
  }

  // Update cart total
  cart.totalCartPrice = calclatTotalCartPrice(cart);
  cart.totalPriceAfterDiscount =
    cart.totalCartPrice - (cart.discountValue ?? 0); // If discountValue exists, subtract it.

  await cart.save(); // Save updated cart

  res.status(200).json({
    status: "Success",
    numberCartItems: cart.cartItems.length,
    totalCartPrice: cart.totalCartPrice,
    totalPriceAfterDiscount: cart.totalPriceAfterDiscount,
    data: cart,
  });
});

//@desc Clear specific user Item
//@route Delete /api/cart:itemId
//@accsess private/User
exports.clearCart = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const token = req.headers["x-anonymous-token"];
  await CartModel.findOneAndDelete(
    req.user ? { customar: req.user._id, companyId } : { token, companyId }
  );

  res.status(200).send();
});

//@desc Update specific cart Item Quantity
//@route Put /api/cart:itemId
//@accsess private/User
exports.updateCartItemQuantity = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { quantity } = req.body;
  const token = req.headers["x-anonymous-token"];
  const customarID = req?.user?._id;

  const cart = await CartModel.findOne(
    req.user ? { customar: customarID, companyId } : { token, companyId }
  );
  if (!cart) {
    return next(new ApiError(`There is no cart for this user or token`, 404));
  }

  const itemIndex = cart.cartItems.findIndex(
    (item) => item.product.toString() === req.params.itemId
  );

  if (itemIndex > -1) {
    cart.cartItems[itemIndex].quantity = quantity;
  } else {
    return next(
      new ApiError(`No item found with ID: ${req.params.itemId}`, 404)
    );
  }

  cart.totalCartPrice = calclatTotalCartPrice(cart);

  if (cart.coupon) {
    calclatTotalCartPrice(cart);
    const coupon = await CouponModel.findOne({
      discountName: cart.coupon,
      companyId,
    });
    calclatTotalCartPriceAfterDiscont(coupon, cart);
  } else {
    calclatTotalCartPrice(cart);
  }

  await cart.save();
  res.status(200).json({
    status: "Success",
    numberCartItems: cart.cartItems.length,
    data: cart,
  });
});

// exports.clearCoupon = asyncHandler(async (req, res, next) => {
//   const dbName = req.query.databaseName;
//   const db = mongoose.connection.useDb(dbName);
//   const CartModel = db.model("Cart", cartSchema);
//   const cart = await CartModel.findOneAndUpdate({ employee: req.user._id });

//   if (cart.coupon !== undefined && cart.coupon !== "") {
//     cart.coupon = undefined;
//   }
//   if (
//     cart.totalPriceAfterDiscount !== undefined &&
//     cart.totalPriceAfterDiscount !== ""
//   ) {
//     cart.totalPriceAfterDiscount = undefined;
//   }
//   await cart.save();

//   res.status(200).send();
// });

//@desc Apply coupon on logged user cart
//@route Put /api/cart/applycoupon
//@accsess private/User
// exports.applyeCoupon = asyncHandler(async (req, res, next) => {
//   const { couponName } = req.body;
//   // 2) Get logged user cart to get total cart price

//   const cart = await CartModel.findOne({ employee: req.user._id });
//   // 1) Get coupon based on coupon name
//   const coupon = await CouponModel.findOne({ discountName: couponName });

//   if (!coupon) {
//     cart.totalPriceAfterDiscount = undefined;
//     cart.coupon = undefined;
//     await cart.save();
//     return next(new ApiError(`Coupon is Invalid or expired`));
//   }
//   // 3) calclate price after discount
//   calclatTotalCartPriceAfterDiscont(coupon, cart);

//   cart.coupon = coupon.discountName;
//   cart.couponCount = coupon.quantity;
//   cart.couponType = coupon.discountType;

//   await cart.save();
//   res.status(200).json({
//     status: "success",
//     numberCartItems: cart.cartItems.length,
//     coupon: coupon.discountName,
//     couponType: coupon.discountType,
//     couponCount: coupon.quantity,
//     data: cart,
//   });
// });
