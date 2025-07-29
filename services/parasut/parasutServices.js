const axios = require("axios");
const productModel = require("../../models/productModel");
require("dotenv").config();

const ParasutServices = (() => {
  const url = process.env.parasut_url;
  const client_id = process.env.parasut_client_id;
  const client_secret = process.env.parasut_client_secret;
  const username = process.env.parasut_username;
  const password = process.env.parasut_password;
  const redirect_uri = process.env.parasut_redirect_uri;
  const urlv4 = process.env.parasut_url_v4;
  const company_id = process.env.parasut_company_id;

  let token = null;
  let refreshToken = null;
  let tokenExpiresAt = null;

  const generateToken = async () => {
    try {
      if (!token || Date.now() >= tokenExpiresAt) {
        console.log("Generating new token...");
        const params = `?client_id=${client_id}&client_secret=${client_secret}&username=${username}&password=${password}&grant_type=password&redirect_uri=${redirect_uri}`;
        const response = await axios.post(`${url}oauth/token${params}`);

        if (response?.data?.access_token) {
          console.log(`token`, response?.data?.access_token);

          token = response.data.access_token;
          refreshToken = response.data.refresh_token;
          tokenExpiresAt = Date.now() + response.data.expires_in * 1000; // Store expiration time
          console.log("Token generated successfully!");
        } else {
          console.log(`response`, response);
        }
      } else {
        console.log(`Token exists`);
      }
    } catch (error) {
      console.error(
        "Error generating token:",
        error.response?.data || error.message
      );
    }
  };

  const generateNewToken = async () => {
    try {
      console.log("Refreshing token...");
      const params = `?client_id=${client_id}&client_secret=${client_secret}&grant_type=refresh_token&redirect_uri=${redirect_uri}&refresh_token=${refreshToken}`;
      const response = await axios.post(`${url}oauth/token${params}`);

      if (response?.data?.access_token) {
        token = response.data.access_token;
        refreshToken = response.data.refresh_token;
        tokenExpiresAt = Date.now() + response.data.expires_in * 1000;
        console.log("Token refreshed successfully!");
      }
    } catch (error) {
      console.error(
        "Error refreshing token:",
        error.response?.data || error.message
      );
    }
  };

  const getValidToken = async () => {
    if (!token || Date.now() >= tokenExpiresAt) {
      await generateToken();
    }
    return token;
  };

  const fetchWithAuth = async (endpoint, options = {}) => {
    try {
      const validToken = await getValidToken();

      const response = await axios({
        url: endpoint,
        ...options,
        headers: {
          Authorization: `Bearer ${validToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      return response.data;
    } catch (error) {
      console.error(
        `Error fetching data:`,
        error.response?.data || error.message
      );

      if (error.response?.status === 401) {
        console.log("Token expired, refreshing...");
        await generateNewToken();
        return fetchWithAuth(endpoint, options);
      }

      throw error;
    }
  };

  const getParasutProducts = async () => {
    try {
      return await fetchWithAuth(`${urlv4}${company_id}/products`);
    } catch (error) {
      console.error("Error fetching products:", error.message);
      throw error;
    }
  };

  const getParasutOneProduct = async (qr) => {
    try {
      return await fetchWithAuth(`${urlv4}${company_id}/products/${qr}`);
    } catch (error) {
      console.error("Error fetching product:", error.message);
      throw error;
    }
  };

  const getCount = async (req, res, next) => {
    try {
      const companyId = req.query.companyId;

      if (!companyId) {
        return res.status(400).json({ message: "companyId is required" });
      }
      req.body.companyId = companyId;

      const docs = await productModel.find({ companyId });

      if (!Array.isArray(docs)) {
        console.error("Fetched data is not an array");
        return res.status(500).json({ message: "Error fetching products" });
      }

      const BATCH_SIZE = 10; // Max requests per batch
      const DELAY_MS = 11000; // Slightly above 10 seconds to avoid API limits

      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = docs.slice(i, i + BATCH_SIZE);

        await Promise.allSettled(
          batch.map(async (doc) => {
            if (!doc.parasutID) return;

            try {
              const parasutProduct = await getParasutOneProduct(doc.parasutID);
              doc.quantity =
                Number(parasutProduct?.data?.attributes?.stock_count) || 0;
            } catch (error) {
              console.error(
                `Error fetching stock count for ${doc._id}:`,
                error
              );
              doc.quantity = 0;
            }
          })
        );

        // Only delay if there are more batches left
        if (i + BATCH_SIZE < docs.length) {
          console.log(
            `Waiting ${DELAY_MS / 1000} seconds before next batch...`
          );
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }

      req.products = docs; // Attach products to `req` for next middleware
      next();
    } catch (error) {
      console.error("Error in getCount:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

  return {
    getParasutProducts,
    getParasutOneProduct,
    generateToken,
    generateNewToken,
    getCount,
  };
})();

module.exports = {
  getParasutProducts: ParasutServices.getParasutProducts,
  getParasutOneProduct: ParasutServices.getParasutOneProduct,
  generateToken: ParasutServices.generateToken,
  generateNewToken: ParasutServices.generateNewToken,
  getCount: ParasutServices.getCount,
};
