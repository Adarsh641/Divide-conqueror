const app = require('../server/app');
const connectDB = require('../server/config/db');

// Cache the database connection across serverless function invocations
let isConnected = false;

module.exports = async (req, res) => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  return app(req, res);
};
