require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');

const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');
const PaymentDraft = require('../models/PaymentDraft');
const StockReservation = require('../models/StockReservation');
const Inquiry = require('../models/Inquiry');
const VerificationToken = require('../models/VerificationToken');
const NotificationSubscription = require('../models/NotificationSubscription');
const Campaign = require('../models/Campaign');
const Settings = require('../models/Settings');
const Banner = require('../models/Banner');

async function runCleanup() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully!');

    // 1. Report BEFORE counts
    console.log('\n--- BEFORE CLEANUP COUNTS ---');
    console.log('Products:', await Product.countDocuments());
    console.log('Categories Total:', await Category.countDocuments());
    console.log('Parent Categories:', await Category.countDocuments({ parent: null }));
    console.log('Subcategories:', await Category.countDocuments({ parent: { $ne: null } }));
    console.log('Orders:', await Order.countDocuments());
    console.log('Users Total:', await User.countDocuments());
    console.log('Admin Users:', await User.countDocuments({ role: 'admin' }));
    console.log('Customer/Test Users:', await User.countDocuments({ role: { $ne: 'admin' } }));
    console.log('Payment Drafts:', await PaymentDraft.countDocuments());
    console.log('Stock Reservations:', await StockReservation.countDocuments());
    console.log('Inquiries:', await Inquiry.countDocuments());
    console.log('Settings:', await Settings.countDocuments());
    console.log('Banners:', await Banner.countDocuments());

    // 2. Perform Cleanups
    console.log('\n--- EXECUTING WIPE ---');

    // A. Remove ALL products
    const deletedProducts = await Product.deleteMany({});
    console.log(`✅ Deleted all products: ${deletedProducts.deletedCount} removed`);

    // B. Keep ONLY top-level main categories (parent: null for women, men, kids); remove all subcategories
    const deletedSubcategories = await Category.deleteMany({ parent: { $ne: null } });
    console.log(`✅ Deleted all subcategories: ${deletedSubcategories.deletedCount} removed`);

    // Ensure all remaining categories are active and valid
    await Category.updateMany({ parent: null }, { $set: { isActive: true } });

    // C. Remove all test orders
    const deletedOrders = await Order.deleteMany({});
    console.log(`✅ Deleted all orders: ${deletedOrders.deletedCount} removed`);

    // D. Remove non-admin users (preserve admin account)
    const deletedUsers = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`✅ Deleted customer/test users: ${deletedUsers.deletedCount} removed`);

    // E. Remove payment drafts, stock reservations, inquiries, verification tokens, campaigns
    const deletedDrafts = await PaymentDraft.deleteMany({});
    console.log(`✅ Deleted payment drafts: ${deletedDrafts.deletedCount} removed`);

    const deletedReservations = await StockReservation.deleteMany({});
    console.log(`✅ Deleted stock reservations: ${deletedReservations.deletedCount} removed`);

    const deletedInquiries = await Inquiry.deleteMany({});
    console.log(`✅ Deleted inquiries: ${deletedInquiries.deletedCount} removed`);

    const deletedTokens = await VerificationToken.deleteMany({});
    console.log(`✅ Deleted verification tokens: ${deletedTokens.deletedCount} removed`);

    const deletedSubs = await NotificationSubscription.deleteMany({});
    console.log(`✅ Deleted notification subscriptions: ${deletedSubs.deletedCount} removed`);

    const deletedCampaigns = await Campaign.deleteMany({});
    console.log(`✅ Deleted campaigns: ${deletedCampaigns.deletedCount} removed`);

    // 3. Report AFTER counts
    console.log('\n--- AFTER CLEANUP REPORT ---');
    console.log('Products:', await Product.countDocuments());
    console.log('Orders:', await Order.countDocuments());
    console.log('Payment Drafts:', await PaymentDraft.countDocuments());
    console.log('Stock Reservations:', await StockReservation.countDocuments());
    console.log('Inquiries:', await Inquiry.countDocuments());
    
    console.log('\nRemaining Users:');
    const remainingUsers = await User.find({}, 'name email role phone');
    remainingUsers.forEach(u => console.log(` - [${u.role}] ${u.name} (${u.email || u.phone})`));

    console.log('\nRemaining Categories (Top-level Main Categories Only):');
    const remainingCats = await Category.find({}).sort({ gender: 1, priority: 1 });
    remainingCats.forEach(c => console.log(` - [${c.gender}] ${c.name} (slug: ${c.slug}, parent: ${c.parent || 'null'})`));

    console.log('\nSettings Preserved:', await Settings.countDocuments());
    console.log('\n🎉 Database cleanup complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
    process.exit(1);
  }
}

runCleanup();
