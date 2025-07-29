// const { default: axios } = require("axios");

// const fetchAllSubscriberDatabases = async () => {
//   try {
//     console.log("Fetching subscriber databases...");

//     // Make a request to get all subscriber databases
//     const response = await axios.get(
//       `${process.env.BASE_URL_FOR_SUB}:4001/api/subscribers`
//     );

//     if (response.data.status === "success") {
//       const subscriberDatabases = response.data.data.map((user) => user.dbName);
//       return subscriberDatabases;
//     } else {
//       throw new Error("Failed to fetch subscriber databases.");
//     }
//   } catch (error) {
//     console.error("Error fetching subscriber databases:", error);
//     return [];
//   }
// };

// module.exports = fetchAllSubscriberDatabases;
