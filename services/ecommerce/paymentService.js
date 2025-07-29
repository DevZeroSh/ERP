const axios = require("axios");
const crypto = require("crypto");

const PaymentService = async (order, body) => {
  const merchant_id = 562290;
  const merchant_key = "inc8Zh7sG7cwpYLs";
  const merchant_salt = "XALxqFJxE3CYuo1a";

  const user_basket = JSON.stringify(
    order.cartItems.map((item) => [
      item.product.toString(),
      item.quantity,
      item.taxPrice,
    ])
  );

  const currency = "TL";
  const payment_type = "card";
  const test_mode = 0;

  const data = {
    merchant_id: merchant_id,
    user_ip: body.ipAddress,
    merchant_oid: order._id.toString(),
    email: body.userInfo.email,
    payment_amount: order.totalOrderPrice * 100,
    user_basket: user_basket,
    no_installment: 1,
    max_installment: 0,
    currency,
    test_mode,
    merchant_ok_url: "https://noontek.com/my-orders",
    merchant_fail_url: "https://noontek.com/error404",
    user_name: body.userInfo.name,
    user_address: order.shippingAddress.details,
    user_phone: body.userInfo.phoneNumber,
    debug_on: true,
    client_lang: "en",
    payment_type,
    non_3d: "0",
    card_type: "",
    installment_count: "0",
    non3d_test_failed: "0",
  };

  const hash_str = `${merchant_id}${body.ipAddress}${order._id.toString()}${
    body.userInfo.email
  }${order.totalOrderPrice * 100}${payment_type}0${currency}1${test_mode}`;

  const paytr_token = hash_str + merchant_salt;
  const token = crypto
    .createHmac("sha256", merchant_key)
    .update(paytr_token)
    .digest("base64");

  data.token = token;

  try {
    const response = await axios.post(
      "https://www.paytr.com/odeme/api/get-token",
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (response.data.status === "success") {
      const paytrUrl = `https://www.paytr.com/odeme/guvenli/${response.data.token}`;
      return paytrUrl;
    } else {
      console.log(`\n\n -------------- error 88 ${response.data} ------------`);
    }
  } catch (error) {
    if (error.response) {
      console.log(`\n\n -------------- error response ${error} ------------`);
    } else {
      console.log(`\n\n -------------- message ${error.message} ------------`);
    }
    return `Payment initialization failed: ${error.message}`;
  }
};

module.exports = { PaymentService };
