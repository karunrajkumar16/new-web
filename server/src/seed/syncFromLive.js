import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import User from '../models/User.js';

async function sync() {
  await connectDB();
  console.log('Fetching live products and reviews from https://shagunfreelance-2.onrender.com/api ...');

  try {
    const productsRes = await fetch('https://shagunfreelance-2.onrender.com/api/products');
    const productsData = await productsRes.json();
    const liveProducts = productsData?.data?.products || [];

    console.log(`Found ${liveProducts.length} products on live site.`);

    // Clear old sample products and insert live products
    await Product.deleteMany({});
    for (const p of liveProducts) {
      await Product.create(p);
      console.log(`Synced product: ${p.name} (${p.slug})`);
    }

    // Fetch and sync reviews
    const reviewsRes = await fetch('https://shagunfreelance-2.onrender.com/api/reviews/recent');
    const reviewsData = await reviewsRes.json();
    const liveReviews = reviewsData?.data?.reviews || [];

    console.log(`Found ${liveReviews.length} reviews on live site.`);
    await Review.deleteMany({});
    for (const r of liveReviews) {
      // Create user if needed
      let userObj = null;
      if (r.user && r.user._id) {
        userObj = await User.findById(r.user._id);
        if (!userObj) {
          userObj = await User.create({
            _id: r.user._id,
            name: r.user.name || 'Customer',
            email: `${r.user.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
            password: 'Password@123',
            role: 'customer',
          });
        }
      }

      await Review.create({
        ...r,
        user: userObj ? userObj._id : undefined,
      });
    }

    console.log('Successfully synced live products, reviews, and customers to local database!');
  } catch (error) {
    console.error('Failed to sync live data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB.');
  }
}

sync();
