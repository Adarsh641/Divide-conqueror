const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/divide_and_rule';
    const isProduction = process.env.NODE_ENV === 'production';
    const conn = await mongoose.connect(mongoUri, {
      autoIndex: !isProduction, // Disable in production for maximum write throughput
      maxPoolSize: 50,          // Maintain up to 50 concurrent socket connections
      minPoolSize: 10,          // Keep 10 warm connections ready
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    
    mongoose.connection.on('error', (err) => {
      console.error(`[Database Error] Runtime error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database Warning] MongoDB disconnected. Attempting reconnect...');
    });

    return conn;
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
