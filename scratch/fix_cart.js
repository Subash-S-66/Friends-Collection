const mongoose = require('mongoose');
require('dotenv').config({ path: './.env.production' });

async function resetAllCarts() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await mongoose.connection.collection('users').updateMany(
    {},
    { $set: { cart: [] } }
  );
  console.log(`Reset carts for all users (modified: ${result.modifiedCount})`);
  process.exit(0);
}

resetAllCarts().catch((e) => {
  console.error(e);
  process.exit(1);
});
