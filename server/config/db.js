const dns = require('dns');
// Set public Google & Cloudflare DNS servers to reliably resolve MongoDB SRV records on Windows/local networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Fallback to system default DNS
}

const mongoose = require('mongoose');

// Security Sanitizer: Never log raw credentials or passwords to console/monitoring logs
function sanitizeUri(uri) {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

// Dynamically resolve mongodb+srv:// to direct replica set shard hosts if local router/ISP DNS drops SRV lookups
async function resolveDynamicSrvToStandardUri(srvUri) {
  if (!srvUri || !srvUri.startsWith('mongodb+srv://')) return srvUri;
  try {
    const withoutPrefix = srvUri.replace('mongodb+srv://', '');
    const atIndex = withoutPrefix.indexOf('@');
    if (atIndex === -1) return srvUri;

    const userPass = withoutPrefix.slice(0, atIndex);
    const rest = withoutPrefix.slice(atIndex + 1);
    const slashIndex = rest.indexOf('/');
    const host = slashIndex === -1 ? rest.split('?')[0] : rest.slice(0, slashIndex);
    const pathAndQuery = slashIndex === -1 ? '/Friends_Collections?retryWrites=true&w=majority' : rest.slice(slashIndex);

    const records = await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
    if (!records || records.length === 0) return srvUri;

    const hostList = records.map((r) => `${r.name}:${r.port}`).join(',');

    let extraParams = '';
    try {
      const txtRecords = await dns.promises.resolveTxt(host);
      if (txtRecords && txtRecords[0] && txtRecords[0][0]) {
        extraParams = '&' + txtRecords[0][0];
      }
    } catch {}

    const hasQuery = pathAndQuery.includes('?');
    const separator = hasQuery ? '&' : '?';
    return `mongodb://${userPass}@${hostList}${pathAndQuery}${separator}ssl=true${extraParams}`;
  } catch {
    // If dynamic resolution fails, check for known direct replica set mapping
    if (srvUri.includes('friendscollection.sxjoxob.mongodb.net')) {
      const authPart = srvUri.replace('mongodb+srv://', '').split('@')[0];
      return `mongodb://${authPart}@ac-acicfv0-shard-00-00.sxjoxob.mongodb.net:27017,ac-acicfv0-shard-00-01.sxjoxob.mongodb.net:27017,ac-acicfv0-shard-00-02.sxjoxob.mongodb.net:27017/Friends_Collections?ssl=true&replicaSet=atlas-127wx5-shard-0&authSource=admin&retryWrites=true&w=majority`;
    }
    return srvUri;
  }
}

const connectDB = async (retries = 3, delay = 2000) => {
  const originalUri = process.env.MONGODB_URI;
  if (!originalUri) {
    console.error('❌ MONGODB_URI is not set in environment variables.');
    return;
  }

  const directUri = await resolveDynamicSrvToStandardUri(originalUri);

  // Try direct replica set URI first (bypasses ISP SRV blocking), then fall back to original URI
  const candidateUris = [directUri, originalUri].filter((u, idx, arr) => u && arr.indexOf(u) === idx);

  const mongooseOptions = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 25, // Prevents connection exhaustion DoS attacks on Atlas cluster
    minPoolSize: 2,  // Keep connection warm for responsive queries
    family: 4        // Force IPv4 to avoid IPv6 resolution latency
  };

  for (const uri of candidateUris) {
    for (let i = 0; i < retries; i++) {
      try {
        const conn = await mongoose.connect(uri, mongooseOptions);
        console.log(`\n🌿 MongoDB Connected: ${conn.connection.host}`);

        // Register runtime disconnect listeners
        mongoose.connection.on('error', (err) => {
          console.error('MongoDB runtime connection error:', err?.message || err);
        });
        return;
      } catch (error) {
        console.warn(`⚠️  MongoDB connection attempt ${i + 1}/${retries} failed (${sanitizeUri(uri)}): ${error.message}`);
        if (i < retries - 1) {
          await new Promise((res) => setTimeout(res, delay));
        }
      }
    }
  }

  console.error(`\n❌ Could not connect to MongoDB at ${sanitizeUri(originalUri)}.`);
  console.error(`   Tip: To use MongoDB Atlas, verify your credentials in the root .env file.\n`);
};

module.exports = connectDB;
