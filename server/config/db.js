const dns = require('dns');
// Set public Google & Cloudflare DNS servers to reliably resolve MongoDB SRV records on Windows/local networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Fallback to system DNS
}

const mongoose = require('mongoose');

// Automatically provide direct 3-shard replica set URI to bypass Windows/ISP DNS SRV query failures
function resolveDirectAtlasUri(uri) {
  if (!uri || !uri.startsWith('mongodb+srv://')) return uri;
  if (uri.includes('friendscollection.sxjoxob.mongodb.net')) {
    const authPart = uri.replace('mongodb+srv://', '').split('@')[0];
    return `mongodb://${authPart}@ac-acicfv0-shard-00-00.sxjoxob.mongodb.net:27017,ac-acicfv0-shard-00-01.sxjoxob.mongodb.net:27017,ac-acicfv0-shard-00-02.sxjoxob.mongodb.net:27017/Friends_Collections?ssl=true&replicaSet=atlas-127wx5-shard-0&authSource=admin&retryWrites=true&w=majority`;
  }
  return uri;
}

const connectDB = async (retries = 3, delay = 2000) => {
  const originalUri = process.env.MONGODB_URI;
  const directUri = resolveDirectAtlasUri(originalUri);

  // Try direct URI first if available (guarantees zero SRV DNS issues), otherwise fallback to original
  const candidateUris = [directUri, originalUri].filter((u, idx, arr) => u && arr.indexOf(u) === idx);

  for (const uri of candidateUris) {
    for (let i = 0; i < retries; i++) {
      try {
        const conn = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 8000
        });
        console.log(`\n🌿 MongoDB Connected: ${conn.connection.host}`);
        return;
      } catch (error) {
        console.warn(`⚠️  MongoDB connection attempt ${i + 1}/${retries} failed: ${error.message}`);
        if (i < retries - 1) {
          await new Promise((res) => setTimeout(res, delay));
        }
      }
    }
  }

  console.error(`\n❌ Could not connect to MongoDB at ${process.env.MONGODB_URI}.`);
  console.error(`   Tip: To use MongoDB Atlas, paste your mongodb+srv:// connection URI in the root .env file.\n`);
};

module.exports = connectDB;
