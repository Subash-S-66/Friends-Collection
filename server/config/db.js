const mongoose = require('mongoose');

const connectDB = async (retries = 3, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 4000
      });
      console.log(`\n🌿 MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`⚠️  MongoDB connection attempt ${i + 1}/${retries} failed: ${error.message}`);
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  console.error(`\n❌ Could not connect to MongoDB at ${process.env.MONGODB_URI}.`);
  console.error(`   Tip: To use MongoDB Atlas, paste your mongodb+srv:// connection URI in the root .env file.\n`);
};

module.exports = connectDB;
