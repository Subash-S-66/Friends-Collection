require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Banner = require('./models/Banner');
const Settings = require('./models/Settings');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Create or update admin user
    const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (!existingAdmin) {
      await User.create({
        name: 'Friends Collections Admin',
        email: process.env.ADMIN_EMAIL,
        phone: process.env.BUSINESS_PHONE || '9500757024',
        password: process.env.ADMIN_PASSWORD,
        role: 'admin'
      });
      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️  Admin user exists');
    }

    // 2. Default parent categories (Men & Women)
    const defaultCategories = [
      // Women
      { name: 'Sarees', slug: 'sarees', gender: 'women', priority: 1, image: '/uploads/card.png', parent: null },
      { name: 'Salwar Suits', slug: 'salwar-suits', gender: 'women', priority: 2, image: '/uploads/card.png', parent: null },
      { name: 'Kurtis & Tunics', slug: 'kurtis', gender: 'women', priority: 3, image: '/uploads/card.png', parent: null },
      { name: 'Lehengas', slug: 'lehengas', gender: 'women', priority: 4, image: '/uploads/card.png', parent: null },
      { name: 'Western & Co-ords', slug: 'western-wear', gender: 'women', priority: 5, image: '/uploads/card.png', parent: null },
      
      // Men
      { name: 'Shirts', slug: 'men-shirts', gender: 'men', priority: 1, image: '/uploads/card.png', parent: null },
      { name: 'Kurtas & Ethnic', slug: 'men-kurtas', gender: 'men', priority: 2, image: '/uploads/card.png', parent: null },
      { name: 'Trousers & Pants', slug: 'men-trousers', gender: 'men', priority: 3, image: '/uploads/card.png', parent: null },
      { name: 'T-Shirts & Polos', slug: 'men-tshirts', gender: 'men', priority: 4, image: '/uploads/card.png', parent: null },
      { name: 'Suits & Blazers', slug: 'men-suits', gender: 'men', priority: 5, image: '/uploads/card.png', parent: null }
    ];

    const categoryMap = {};
    for (const cat of defaultCategories) {
      const c = await Category.findOneAndUpdate(
        { slug: cat.slug },
        { ...cat },
        { upsert: true, new: true }
      );
      categoryMap[cat.slug] = c._id;
      console.log(`✅ Category seeded [${cat.gender}]: ${cat.name}`);
    }

    // 2b. Default subcategories (like Flipkart / Myntra taxonomy)
    const defaultSubcategories = [
      // Women subcategories
      { name: 'Banarasi Silk Sarees', slug: 'banarasi-silk', gender: 'women', parentSlug: 'sarees', priority: 1 },
      { name: 'Kanchipuram Silk Sarees', slug: 'kanchipuram-silk', gender: 'women', parentSlug: 'sarees', priority: 2 },
      { name: 'Pure Cotton Sarees', slug: 'cotton-sarees', gender: 'women', parentSlug: 'sarees', priority: 3 },
      { name: 'Party Wear Sarees', slug: 'party-wear-sarees', gender: 'women', parentSlug: 'sarees', priority: 4 },
      { name: 'Anarkali Suits', slug: 'anarkali-suits', gender: 'women', parentSlug: 'salwar-suits', priority: 1 },
      { name: 'Straight Cut Suits', slug: 'straight-cut-suits', gender: 'women', parentSlug: 'salwar-suits', priority: 2 },
      { name: 'Sharara & Gharara Sets', slug: 'sharara-sets', gender: 'women', parentSlug: 'salwar-suits', priority: 3 },
      { name: 'A-Line Kurtis', slug: 'a-line-kurtis', gender: 'women', parentSlug: 'kurtis', priority: 1 },
      { name: 'Short Kurtis', slug: 'short-kurtis', gender: 'women', parentSlug: 'kurtis', priority: 2 },
      { name: 'Festive Wear Kurtis', slug: 'festive-kurtis', gender: 'women', parentSlug: 'kurtis', priority: 3 },
      { name: 'Bridal Lehengas', slug: 'bridal-lehengas', gender: 'women', parentSlug: 'lehengas', priority: 1 },
      { name: 'Party Wear Lehengas', slug: 'party-wear-lehengas', gender: 'women', parentSlug: 'lehengas', priority: 2 },
      { name: 'Co-ord Sets', slug: 'co-ord-sets', gender: 'women', parentSlug: 'western-wear', priority: 1 },
      { name: 'Maxi Dresses', slug: 'maxi-dresses', gender: 'women', parentSlug: 'western-wear', priority: 2 },

      // Men subcategories
      { name: 'Pure Linen Shirts', slug: 'men-linen-shirts', gender: 'men', parentSlug: 'men-shirts', priority: 1 },
      { name: 'Casual Printed Shirts', slug: 'men-printed-shirts', gender: 'men', parentSlug: 'men-shirts', priority: 2 },
      { name: 'Formal Oxford Shirts', slug: 'men-formal-shirts', gender: 'men', parentSlug: 'men-shirts', priority: 3 },
      { name: 'Short Festive Kurtas', slug: 'men-short-kurtas', gender: 'men', parentSlug: 'men-kurtas', priority: 1 },
      { name: 'Kurta Pajama Sets', slug: 'men-kurta-sets', gender: 'men', parentSlug: 'men-kurtas', priority: 2 },
      { name: 'Nehru & Modi Jackets', slug: 'men-nehru-jackets', gender: 'men', parentSlug: 'men-kurtas', priority: 3 },
      { name: 'Stretch Chinos', slug: 'men-chinos', gender: 'men', parentSlug: 'men-trousers', priority: 1 },
      { name: 'Tailored Formal Trousers', slug: 'men-formal-pants', gender: 'men', parentSlug: 'men-trousers', priority: 2 },
      { name: 'Casual Cargos', slug: 'men-cargos', gender: 'men', parentSlug: 'men-trousers', priority: 3 },
      { name: 'Oversized Tees', slug: 'men-oversized-tees', gender: 'men', parentSlug: 'men-tshirts', priority: 1 },
      { name: 'Classic Pique Polos', slug: 'men-classic-polos', gender: 'men', parentSlug: 'men-tshirts', priority: 2 },
      { name: 'Wedding & Festive Blazers', slug: 'men-wedding-blazers', gender: 'men', parentSlug: 'men-suits', priority: 1 },
      { name: 'Slim Fit Formal Suits', slug: 'men-slim-suits', gender: 'men', parentSlug: 'men-suits', priority: 2 }
    ];

    const subcategoryMap = {};
    for (const sub of defaultSubcategories) {
      const parentId = categoryMap[sub.parentSlug];
      const s = await Category.findOneAndUpdate(
        { slug: sub.slug },
        { name: sub.name, slug: sub.slug, gender: sub.gender, parent: parentId, priority: sub.priority, image: '/uploads/card.png' },
        { upsert: true, new: true }
      );
      subcategoryMap[sub.slug] = s._id;
      console.log(`✅ Subcategory seeded [${sub.gender}]: ${sub.name} (under ${sub.parentSlug})`);
    }

    // 3. Dynamic settings including Theme Studio configuration
    const defaultSettings = [
      {
        key: 'themeConfig',
        value: {
          id: 'wine',
          name: 'Royal Wine & Rose Gold (Brand Signature)',
          primary: '#54142D',
          primaryLight: '#762243',
          primaryDark: '#380B1C',
          accent: '#C88A65',
          accentLight: '#E2B89D',
          accentDark: '#9C623E',
          bgTint: '#FAF7F2'
        }
      },
      {
        key: 'announcementBar',
        value: { text: '🎉 Free Shipping on Orders Above ₹999 across Chennai & Tamil Nadu!', isActive: true }
      },
      {
        key: 'shippingCharge',
        value: { amount: 79, freeAbove: 999 }
      },
      {
        key: 'contactInfo',
        value: {
          phones: ['9500757024'],
          email: 'friends.collection06@gmail.com',
          address: '7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai - 12',
          instagram: 'friends_collection_in'
        }
      }
    ];

    for (const setting of defaultSettings) {
      await Settings.findOneAndUpdate(
        { key: setting.key },
        { value: setting.value },
        { upsert: true }
      );
      console.log(`✅ Setting saved: ${setting.key}`);
    }

    // 4. Seed initial hero banner
    const existingBanner = await Banner.findOne();
    if (!existingBanner) {
      await Banner.create({
        title: 'Style That Defines You',
        subtitle: 'Bespoke Kanchipuram Sarees, Embroidered Anarkalis, and Festive Men’s Silks',
        image: '/uploads/card.png',
        ctaText: 'Explore Collection',
        ctaLink: '/shop',
        priority: 1,
        isActive: true
      });
      console.log('✅ Default Hero Banner created');
    }

    // 5. Seed initial products with variant-level stock, gender, and subcategories
    await Product.deleteMany({});
    const sampleProducts = [
      // WOMEN PRODUCTS
      {
        title: 'Royal Maroon Silk Banarasi Saree',
        slug: 'royal-maroon-silk-banarasi-saree',
        gender: 'women',
        description: 'Handwoven Banarasi silk saree adorned with intricate gold zari brocade work along the pallu and border. Ideal for grand celebrations, weddings, and traditional pujas.',
        price: 2999,
        salePrice: 2299,
        category: categoryMap['sarees'],
        subcategory: subcategoryMap['banarasi-silk'],
        images: ['/uploads/card.png', '/uploads/logo.png'],
        sizes: ['Free Size'],
        colors: ['Maroon', 'Wine'],
        variants: [
          { color: 'Maroon', size: 'Free Size', stock: 8, sku: 'FC-SAR-MRN' },
          { color: 'Wine', size: 'Free Size', stock: 2, sku: 'FC-SAR-WIN' }
        ],
        stock: 10,
        isFeatured: true,
        tags: ['trending', 'new-arrival', 'festive']
      },
      {
        title: 'Embroidered Georgette Anarkali Suit',
        slug: 'embroidered-georgette-anarkali-suit',
        gender: 'women',
        description: 'Floor-length georgette Anarkali gown with sequin and thread embroidery on the yoke. Comes with matching soft santoon bottoms and a foil-printed dupatta.',
        price: 2499,
        salePrice: 1899,
        category: categoryMap['salwar-suits'],
        subcategory: subcategoryMap['anarkali-suits'],
        images: ['/uploads/card.png', '/uploads/logo.png'],
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Navy Blue', 'Wine'],
        variants: [
          { color: 'Navy Blue', size: 'S', stock: 3, sku: 'FC-ANK-BLU-S' },
          { color: 'Navy Blue', size: 'M', stock: 6, sku: 'FC-ANK-BLU-M' },
          { color: 'Navy Blue', size: 'L', stock: 0, sku: 'FC-ANK-BLU-L' },
          { color: 'Navy Blue', size: 'XL', stock: 2, sku: 'FC-ANK-BLU-XL' },
          { color: 'Wine', size: 'M', stock: 0, sku: 'FC-ANK-WIN-M' },
          { color: 'Wine', size: 'L', stock: 4, sku: 'FC-ANK-WIN-L' }
        ],
        stock: 15,
        isFeatured: true,
        tags: ['trending', 'festive']
      },
      {
        title: 'Pastel Floral Chanderi Kurti Set',
        slug: 'pastel-floral-chanderi-kurti-set',
        gender: 'women',
        description: 'Graceful straight-cut chanderi silk kurti with delicate floral digital prints and gota patti lace border. Paired with straight pants.',
        price: 1499,
        salePrice: 999,
        category: categoryMap['kurtis'],
        subcategory: subcategoryMap['a-line-kurtis'],
        images: ['/uploads/card.png', '/uploads/logo.png'],
        sizes: ['M', 'L', 'XL', 'XXL'],
        colors: ['Pastel Pink', 'Mint Green'],
        variants: [
          { color: 'Pastel Pink', size: 'M', stock: 5, sku: 'FC-KUR-PNK-M' },
          { color: 'Pastel Pink', size: 'L', stock: 7, sku: 'FC-KUR-PNK-L' },
          { color: 'Pastel Pink', size: 'XL', stock: 4, sku: 'FC-KUR-PNK-XL' },
          { color: 'Mint Green', size: 'M', stock: 4, sku: 'FC-KUR-GRN-M' },
          { color: 'Mint Green', size: 'L', stock: 3, sku: 'FC-KUR-GRN-L' }
        ],
        stock: 23,
        isFeatured: true,
        tags: ['new-arrival']
      },
      {
        title: 'Semi-Stitched Velvet Bridal Lehenga',
        slug: 'semi-stitched-velvet-bridal-lehenga',
        gender: 'women',
        description: 'Regal micro-velvet lehenga choli with dori, zari, and glitter sequin hand embroidery. Features a flared silhouette with dual can-can inner support.',
        price: 5999,
        salePrice: 4499,
        category: categoryMap['lehengas'],
        subcategory: subcategoryMap['bridal-lehengas'],
        images: ['/uploads/card.png', '/uploads/logo.png'],
        sizes: ['Free Size'],
        colors: ['Deep Red', 'Emerald Green'],
        variants: [
          { color: 'Deep Red', size: 'Free Size', stock: 2, sku: 'FC-LEH-RED' },
          { color: 'Emerald Green', size: 'Free Size', stock: 1, sku: 'FC-LEH-GRN' }
        ],
        stock: 3,
        isFeatured: true,
        tags: ['trending', 'festive']
      },
      {
        title: 'Kanchipuram Pure Zari Silk Saree',
        slug: 'kanchipuram-pure-zari-silk-saree',
        gender: 'women',
        description: 'Authentic Kanchipuram temple silk saree woven with real gold zari motifs of peacocks and chakras. Heritage heirloom quality from master weavers.',
        price: 4999,
        salePrice: 3899,
        category: categoryMap['sarees'],
        subcategory: subcategoryMap['kanchipuram-silk'],
        images: ['/uploads/card.png', '/uploads/logo.png'],
        sizes: ['Free Size'],
        colors: ['Peacock Blue', 'Crimson'],
        variants: [
          { color: 'Peacock Blue', size: 'Free Size', stock: 0, sku: 'FC-KAN-BLU' },
          { color: 'Crimson', size: 'Free Size', stock: 0, sku: 'FC-KAN-RED' }
        ],
        stock: 0, // FLIPKART STYLE: OUT OF STOCK!
        isFeatured: true,
        tags: ['trending', 'festive']
      },
      {
        title: 'Boho Printed Summer Co-ord Set',
        slug: 'boho-printed-summer-co-ord-set',
        gender: 'women',
        description: 'Breezy rayon printed crop shirt with high-waist wide-leg pants. Stylish, airy, and effortlessly chic for daytime events and casual outings.',
        price: 1899,
        salePrice: 1299,
        category: categoryMap['western-wear'],
        subcategory: subcategoryMap['co-ord-sets'],
        images: ['/uploads/card.png', '/uploads/logo.png'],
        sizes: ['S', 'M', 'L'],
        colors: ['Mustard', 'Olive'],
        variants: [
          { color: 'Mustard', size: 'S', stock: 4, sku: 'FC-CRD-MUS-S' },
          { color: 'Mustard', size: 'M', stock: 5, sku: 'FC-CRD-MUS-M' },
          { color: 'Olive', size: 'L', stock: 2, sku: 'FC-CRD-OLV-L' }
        ],
        stock: 11,
        isFeatured: false,
        tags: ['new-arrival']
      },

      // MEN PRODUCTS
      {
        title: 'Pure French Linen Mandarin Collar Shirt',
        slug: 'pure-french-linen-mandarin-collar-shirt',
        gender: 'men',
        description: 'Crafted from 100% pure organic European flax linen. Breathable, relaxed silhouette with a structured mandarin collar and mother-of-pearl buttons. Ideal for tropical evenings and casual elegance.',
        price: 2199,
        salePrice: 1699,
        category: categoryMap['men-shirts'],
        subcategory: subcategoryMap['men-linen-shirts'],
        images: ['/uploads/card.png', '/uploads/logo.png'],
        sizes: ['M', 'L', 'XL', 'XXL'],
        colors: ['Beige', 'Sky Blue', 'White'],
        variants: [
          { color: 'Beige', size: 'M', stock: 6, sku: 'FC-MSH-BEI-M' },
          { color: 'Beige', size: 'L', stock: 8, sku: 'FC-MSH-BEI-L' },
          { color: 'Sky Blue', size: 'M', stock: 4, sku: 'FC-MSH-BLU-M' },
          { color: 'Sky Blue', size: 'L', stock: 5, sku: 'FC-MSH-BLU-L' },
          { color: 'White', size: 'XL', stock: 3, sku: 'FC-MSH-WHT-XL' }
        ],
        stock: 26,
        isFeatured: true,
        tags: ['trending', 'new-arrival']
      },
      {
        title: 'Royal Raw Silk Embroidered Kurta Pajama Set',
        slug: 'royal-raw-silk-embroidered-kurta-pajama-set',
        gender: 'men',
        description: 'Exquisite silk blend festive kurta set with subtle Resham and thread embroidery around the placket and cuffs. Comes with comfortable churidar pyjama. Perfect for festivals and wedding receptions.',
        price: 3499,
        salePrice: 2799,
        category: categoryMap['men-kurtas'],
        subcategory: subcategoryMap['men-kurta-sets'],
        images: ['/uploads/card.png', '/uploads/logo.png'],
        sizes: ['38', '40', '42', '44'],
        colors: ['Wine', 'Ivory Cream'],
        variants: [
          { color: 'Wine', size: '38', stock: 3, sku: 'FC-MKU-WIN-38' },
          { color: 'Wine', size: '40', stock: 5, sku: 'FC-MKU-WIN-40' },
          { color: 'Ivory Cream', size: '40', stock: 2, sku: 'FC-MKU-IVO-40' },
          { color: 'Ivory Cream', size: '42', stock: 4, sku: 'FC-MKU-IVO-42' }
        ],
        stock: 14,
        isFeatured: true,
        tags: ['trending', 'festive']
      },
      {
        title: 'Tailored Slim Fit Stretch Chinos',
        slug: 'tailored-slim-fit-stretch-chinos',
        gender: 'men',
        description: 'Premium compact cotton stretch fabric offering all-day flexibility. Clean flat-front finish with internal grip waistband and double-welt back pockets.',
        price: 1799,
        salePrice: 1399,
        category: categoryMap['men-trousers'],
        subcategory: subcategoryMap['men-chinos'],
        images: ['/uploads/card.png', '/uploads/logo.png'],
        sizes: ['30', '32', '34', '36'],
        colors: ['Khaki', 'Navy Blue', 'Olive'],
        variants: [
          { color: 'Khaki', size: '32', stock: 5, sku: 'FC-MTR-KHK-32' },
          { color: 'Khaki', size: '34', stock: 4, sku: 'FC-MTR-KHK-34' },
          { color: 'Navy Blue', size: '32', stock: 6, sku: 'FC-MTR-BLU-32' },
          { color: 'Olive', size: '30', stock: 2, sku: 'FC-MTR-OLV-30' }
        ],
        stock: 17,
        isFeatured: false,
        tags: ['new-arrival']
      },
      {
        title: 'Bespoke Textured Velvet Wedding Blazer',
        slug: 'bespoke-textured-velvet-wedding-blazer',
        gender: 'men',
        description: 'Single-breasted rich micro-velvet evening blazer with satin shawl lapels and engraved metal buttons. An unmatched statement piece for galas and sangeet parties.',
        price: 5499,
        salePrice: 4199,
        category: categoryMap['men-suits'],
        subcategory: subcategoryMap['men-wedding-blazers'],
        images: ['/uploads/card.png', '/uploads/logo.png'],
        sizes: ['38', '40', '42'],
        colors: ['Midnight Blue', 'Emerald Green'],
        variants: [
          { color: 'Midnight Blue', size: '38', stock: 1, sku: 'FC-MBLZ-BLU-38' }, // 1 Left!
          { color: 'Midnight Blue', size: '40', stock: 2, sku: 'FC-MBLZ-BLU-40' }  // 2 Left!
        ],
        stock: 3, // Low stock: Only 3 left!
        isFeatured: true,
        tags: ['festive', 'trending']
      },
      {
        title: 'Heavyweight Drop-Shoulder Graphic Tee',
        slug: 'heavyweight-drop-shoulder-graphic-tee',
        gender: 'men',
        description: '240 GSM heavy combed cotton streetwear t-shirt with ribbed crew neck and puff print typography on the back. Boxy, relaxed modern fit.',
        price: 999,
        salePrice: 799,
        category: categoryMap['men-tshirts'],
        subcategory: subcategoryMap['men-oversized-tees'],
        images: ['/uploads/card.png', '/uploads/logo.png'],
        sizes: ['M', 'L', 'XL'],
        colors: ['Charcoal Black', 'Off-White'],
        variants: [
          { color: 'Charcoal Black', size: 'M', stock: 0, sku: 'FC-MTS-BLK-M' },
          { color: 'Charcoal Black', size: 'L', stock: 0, sku: 'FC-MTS-BLK-L' },
          { color: 'Off-White', size: 'XL', stock: 0, sku: 'FC-MTS-WHT-XL' }
        ],
        stock: 0, // FLIPKART STYLE: OUT OF STOCK!
        isFeatured: false,
        tags: ['trending']
      }
    ];

    await Product.insertMany(sampleProducts);
    console.log('✅ Initial Products with Variants, Subcategories, and Stock states seeded');

    console.log('\n🎉 Database seeded successfully with dynamic theme and variants!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
