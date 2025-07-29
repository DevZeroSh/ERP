const express = require("express");
const {
  createHepsiJetShipping,
  getHepsiJetOrderShipping,
  cancelHepsiJetOrderShipping,
  returnHepsiJetShipping,
  fetchHepsiJetReturnDates,
  cancelReturnHepsiJetShipping,
} = require("../../services/ecommerce/hepsiJetService");

const hepsiJetRouter = express.Router();

hepsiJetRouter.post("/shipping", createHepsiJetShipping);
hepsiJetRouter.post("/shipping/return", returnHepsiJetShipping);
hepsiJetRouter.post("/shipping/returnCancel", cancelReturnHepsiJetShipping);
hepsiJetRouter.get("/shipping/returnDates", fetchHepsiJetReturnDates);
hepsiJetRouter.post("/shipping/cancel", cancelHepsiJetOrderShipping);
hepsiJetRouter.post("/shipping/track", getHepsiJetOrderShipping);

module.exports = hepsiJetRouter;
