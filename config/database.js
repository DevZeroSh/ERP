const mongoose = require("mongoose");

const dbContacion = async () => {
  var dbUrl = process.env.DB_URI;

  mongoose
    .connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then((conn) => {
      console.log(`databases Connceted:${conn.connection.host}`);
    });
};

module.exports = dbContacion;
