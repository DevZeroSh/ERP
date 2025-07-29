const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const globalError = require("./middlewares/errorMiddleware");
// const cron = require("node-cron");

dotenv.config({ path: "config.env" });

const app = express();

// Database connection (assuming dbContacion is a function connecting to your database)
const dbContacion = require("./config/database");
const mountRoutes = require("./routes");
// const { syncAllData } = require("./services/syncServices");
dbContacion();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "uploads")));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}
// cron.schedule("* * * * *", async () => {
//   console.log("Start Sync");
//   await syncAllData();
// });
// Mount Routes
mountRoutes(app);

// Global error handling middleware for express
app.use(globalError);
// app.use(express.static(path.join(__dirname, "build")));
// app.get("/*", (req, res) => {
//   res.sendFile(path.join(__dirname, "build", "index.html"));
// });

const PORT = 8000 || 4000;
const server = app.listen(PORT, () => {
  console.log(`app running on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.error(`unhandledRejection Errors:${err.name} | ${err.message}`);
  server.close(() => {
    console.error(`Shutting down....`);
    process.exit(1);
  });
});
