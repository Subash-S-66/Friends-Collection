const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env.production' });

async function fixCart() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await mongoose.connection.collection('users').find({ 'cart.0': { $exists: true } }).toArray();
  for (const user of users) {
    let changed = false;
    const newCart = (user.cart || []).map((item) => {
      if (item.quantity > 10 || item.stock <= 0) {
        changed = true;
        return { ...item, quantity: 1 };
      }
      return item;
    });
    if (changed) {
      await mongoose.connection.collection('users').updateOne(
        { _id: user._id },
        { $set: { cart: newCart } }
      );
      console.log(`Updated cart for ${user.email}`);
    }
  }
  console.log('Done fixing cart!');
  process.exit(0);
}

fixCart().catch((e) => {
  console.error(e);
  process.exit(1);
});
