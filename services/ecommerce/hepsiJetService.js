const axios = require("axios");
const asyncHandler = require("express-async-handler");

let authToken = "";
let authTokenExpiry = null;
const username = process.env.hpjt_username;
const password = process.env.hpjt_password;
const baseUrl = process.env.hpjt_base_url;

// Fetches and stores the HepsiJet token
const fetchHepsiJetToken = async () => {
  const credentials = Buffer.from(`${username}:${password}`, "utf-8").toString(
    "base64"
  );
  try {
    const response = await axios.get(`${baseUrl}/auth/getToken`, {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 200 && response.data?.data?.token) {
      authToken = response.data.data.token;
      authTokenExpiry = new Date(Date.now() + 59 * 60 * 1000);
      console.log("✅ New HepsiJet Token:", authToken);
      return authToken;
    } else {
      throw new Error("Failed to fetch token");
    }
  } catch (error) {
    console.error(
      "❌ Error fetching HepsiJet token:",
      error.response?.data || error.message
    );
    throw new Error(error.response?.data?.message || "Token request failed");
  }
};

// Ensures a valid token before making a request
const ensureToken = async () => {
  const now = new Date();

  if (!authToken || !authTokenExpiry || now >= authTokenExpiry) {
    console.log("🔄 Token expired or not found. Fetching new token...");
    await fetchHepsiJetToken();
  }
};

// Create HepsiJet Shipping Order
exports.createHepsiJetShipping = asyncHandler(async (req, res) => {
  const credentials = Buffer.from(`${username}:${password}`, "utf-8").toString(
    "base64"
  );
  try {
    await ensureToken();

    const { data } = req.body;

    const response = await axios.post(
      `${baseUrl}/delivery/sendDeliveryOrder`,
      data,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "X-Auth-Token": authToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data?.status === "FAIL") {
      return res
        .status(500)
        .json({ message: response.data.message || "Shipping order failed" });
    }

    res
      .status(200)
      .json({ message: "Shipping order created", data: response.data });
  } catch (error) {
    console.error(
      "❌ Error creating shipping order:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message: error.response?.data?.message || "Error creating shipping order",
      error: error.response?.data || error.message,
    });
  }
});

// Return HepsiJet Order
exports.returnHepsiJetShipping = asyncHandler(async (req, res) => {
  const credentials = Buffer.from(`${username}:${password}`, "utf-8").toString(
    "base64"
  );
  try {
    await ensureToken();

    const response = await axios.post(
      `${baseUrl}/rest/delivery/sendDeliveryOrderEnhanced`,
      req.body,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "X-Auth-Token": authToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data?.status === "FAIL") {
      return res
        .status(500)
        .json({ message: response.data.message || "Order return failed" });
    }

    res
      .status(200)
      .json({ message: response?.data?.status, data: response.data?.data });
  } catch (error) {
    console.error(
      "❌ Error returning shipping order:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message:
        error.response?.data?.message || "Error returning shipping order",
      error: error.response?.data || error.message,
    });
  }
});

// Cancel return HepsiJet Order
exports.cancelReturnHepsiJetShipping = asyncHandler(async (req, res) => {
  const credentials = Buffer.from(`${username}:${password}`, "utf-8").toString(
    "base64"
  );

  try {
    await ensureToken();

    const response = await axios.post(
      `${baseUrl}/rest/delivery/deleteDeliveryOrder/${req.params?.id}`,
      req.body,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "X-Auth-Token": authToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data?.status === "FAIL") {
      return res
        .status(500)
        .json({ message: response.data.message || "Order return failed" });
    }

    res
      .status(200)
      .json({ message: response?.data?.status, data: response.data?.data });
  } catch (error) {
    console.error(
      "❌ Error returning shipping order:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message:
        error.response?.data?.message || "Error returning shipping order",
      error: error.response?.data || error.message,
    });
  }
});

// Fetch HepsiJet available return dates
exports.fetchHepsiJetReturnDates = asyncHandler(async (req, res) => {
  const credentials = Buffer.from(`${username}:${password}`, "utf-8").toString(
    "base64"
  );
  try {
    await ensureToken();

    const { startDate, endDate, city, town } = req.query;

    const response = await axios.get(
      `${baseUrl}/rest/delivery/findAvailableDeliveryDatesV2?startDate=${startDate}&endDate=${endDate}&deliveryType=RETURNED&city=${city}&town=${town}`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "X-Auth-Token": authToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (response?.data?.status != "OK") {
      return res
        .status(500)
        .json({ message: response.data.message || "Order return failed" });
    }

    res
      .status(200)
      .json({ message: "Available return dates", data: response.data?.data });
  } catch (error) {
    console.error(
      "❌ Error returning shipping order:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message:
        error.response?.data?.message || "Error returning shipping order",
      error: error.response?.data || error.message,
    });
  }
});

// Track HepsiJet Order Shipping
exports.getHepsiJetOrderShipping = asyncHandler(async (req, res) => {
  const credentials = Buffer.from(`${username}:${password}`, "utf-8").toString(
    "base64"
  );
  try {
    await ensureToken();

    const { customerDeliveryNo } = req.body;

    const response = await axios.post(
      `${baseUrl}/delivery/integration/track`,
      { barcodes: [`${customerDeliveryNo}`] },
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "X-Auth-Token": authToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data?.status === "FAIL") {
      return res
        .status(500)
        .json({ message: response.data.message || "Tracking order failed" });
    }

    res
      .status(200)
      .json({ message: "Shipping order tracked", data: response.data });
  } catch (error) {
    console.error(
      "❌ Error tracking shipping order:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message: error.response?.data?.message || "Error tracking shipping order",
      error: error.response?.data || error.message,
    });
  }
});

// Cancel HepsiJet Order Shipping
exports.cancelHepsiJetOrderShipping = asyncHandler(async (req, res) => {
  const credentials = Buffer.from(`${username}:${password}`, "utf-8").toString(
    "base64"
  );
  try {
    await ensureToken();

    const { deleteReason, id } = req.body;

    const response = await axios.post(
      `${baseUrl}/rest/delivery/deleteDeliveryOrder/${id}`,
      { deleteReason: deleteReason },
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "X-Auth-Token": authToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data?.status === "FAIL") {
      return res
        .status(500)
        .json({ message: response.data.message || "Cancelling order failed" });
    }

    res
      .status(200)
      .json({ message: "Shipping order cancelled", data: response.data });
  } catch (error) {
    res.status(500).json({
      message:
        error.response?.data?.message || "Error cancelling shipping order",
      error: error.response?.data || error.message,
    });
  }
});
