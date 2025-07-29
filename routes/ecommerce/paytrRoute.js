const express = require("express");
const crypto = require("crypto");
const authService = require("../../services/authService");
const {
  createCashOrder,
  payTROrder,
  returnMoney,
} = require("../../services/ecommerce/ecommerceOrderService");
const querystring = require("querystring");
const raw = require("body-parser").raw;
const paytrRouter = express.Router();

paytrRouter.post(
  "/paytr-token/:id",
  payTROrder,
  authService.ecommerceProtect,
  createCashOrder
);

paytrRouter.post("/refund-money", authService.ecommerceProtect, returnMoney);

paytrRouter.post(
  "/callback",
  raw({ type: "application/x-www-form-urlencoded" }),
  (req, res) => {
    try {
      const rawBody = req.body.toString("utf8");
      const callback = querystring.parse(rawBody);

      const { merchant_oid, status, total_amount, hash } = callback;
      const merchant_key = "inc8Zh7sG7cwpYLs";
      const merchant_salt = "XALxqFJxE3CYuo1a";

      if (!merchant_oid || !status || !total_amount || !hash) {
        console.log(`missing fields`);
        return res.status(400).send("Missing fields");
      }

      const paytr_token = `${merchant_oid}${merchant_salt}${status}${total_amount}`;
      const token = crypto
        .createHmac("sha256", merchant_key)
        .update(paytr_token)
        .digest("base64");

      if (token !== hash) {
        console.error("Invalid hash!");
        return res.status(400).send("Bad hash");
      }

      // Success
      if (status === "success") {
        console.log("✅ Payment success for:", merchant_oid);
        //TODO: Create order

        res.send("OK");
      } else {
        console.log("❌ Payment failed for:", merchant_oid);

        res.send(`FAIL for cart: ${merchant_oid}`);
      }
    } catch (error) {
      console.error("Callback error:", error.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = paytrRouter;
