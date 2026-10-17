require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const localUri = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/friends_collections';
const atlasUri = process.env.MONGODB_URI;

async function migrate() {
  console.log('--- Friends Collections MongoDB Atlas Migration ---');
  
  // 1. Connect to Local MongoDB
  console.log('1. Connecting to Local MongoDB...');
  let localConn = null;
  try {
    localConn = await mongoose.createConnection(localUri, { serverSelectionTimeoutMS: 4000 }).asPromise();
    console.log('   Connected to Local MongoDB!');
  } catch (err) {
    console.log('   Local MongoDB notice:', err.message);
  }

  // 2. Connect to Atlas
  console.log('2. Connecting to MongoDB Atlas...');
  let atlasConn;
  try {
    atlasConn = await mongoose.createConnection(atlasUri, { serverSelectionTimeoutMS: 20000 }).asPromise();
    console.log('   Successfully connected to MongoDB Atlas!');
  } catch (err) {
    console.error('   FATAL: Could not connect to Atlas:', err.message);
    process.exit(1);
  }

  const collections = ['users', 'categories', 'products', 'banners', 'settings', 'orders'];
  let totalMigrated = 0;

  if (localConn) {
    console.log('3. Checking and transferring local collections to Atlas...');
    for (const colName of collections) {
      try {
        const localCol = localConn.collection(colName);
        const docs = await localCol.find({}).toArray();
        console.log(`   - Found ${docs.length} documents in local [${colName}]`);
        
        if (docs.length > 0) {
          const atlasCol = atlasConn.collection(colName);
          for (const doc of docs) {
            await atlasCol.replaceOne({ _id: doc._id }, doc, { upsert: true });
          }
          console.log(`     -> Copied ${docs.length} to Atlas [${colName}]`);
          totalMigrated += docs.length;
        }
      } catch (err) {
        console.error(`     Error copying ${colName}:`, err.message);
      }
    }
    await localConn.close();
  }

  // 4. Verify Atlas Data
  console.log('\n4. Verifying Atlas Collections:');
  const counts = {};
  for (const colName of collections) {
    const atlasCol = atlasConn.collection(colName);
    const count = await atlasCol.countDocuments();
    counts[colName] = count;
    console.log(`   - ${colName}: ${count} document(s)`);
  }

  await atlasConn.close();

  // 5. If categories or products are 0, run seed against Atlas
  if (counts['categories'] === 0 || counts['products'] === 0) {
    console.log('\n5. Seeding Atlas with complete product & category catalog...');
    process.env.MONGODB_URI = atlasUri;
    require('./seed.js');
  } else {
    console.log('\nSUCCESS: All collections are verified and present in MongoDB Atlas!');
  }
}

migrate().catch(console.error);
