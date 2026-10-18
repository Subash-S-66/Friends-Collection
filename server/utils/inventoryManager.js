const Product = require('../models/Product');

// Helper to normalize strings for robust variant size/color matching
const norm = (s) => (s || '').toString().trim().toLowerCase();

/**
 * Atomically deducts inventory for order items using MongoDB optimistic concurrency control.
 * Guarantees that if two customers attempt to purchase the final remaining inventory concurrently,
 * exactly one customer succeeds and the other receives a clear out-of-stock notification,
 * preventing race conditions or overselling (like Amazon and Flipkart).
 *
 * If any single item in the order has insufficient stock at the atomic update stage,
 * all previously deducted items in this transaction are immediately rolled back and restored.
 *
 * @param {Array} items - Array of { product: string|ObjectId, quantity: number, size?: string, color?: string, title?: string }
 * @returns {Promise<{ success: boolean, deductedItems: Array, failedItem?: object, error?: string }>}
 */
async function deductOrderStockAtomically(items) {
  const deductedItems = [];

  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const productId = (item.product?._id || item.product || '').toString();

    const product = await Product.findById(productId);
    if (!product) {
      await rollbackStockDeduction(deductedItems);
      return {
        success: false,
        error: `Product not found: ${item.title || productId}`,
        failedItem: item
      };
    }

    const itemSize = norm(item.size);
    const itemColor = norm(item.color);

    // Find variant if product has variants
    let matchedVariant = null;
    if (product.variants && product.variants.length > 0) {
      matchedVariant = product.variants.find(
        (v) =>
          (!itemSize || !v.size || norm(v.size) === itemSize || itemSize.startsWith(norm(v.size))) &&
          (!itemColor || !v.color || norm(v.color) === itemColor)
      );
    }

    let updatedProduct = null;

    if (matchedVariant) {
      // Atomic condition: product total stock >= qty AND the matched variant stock >= qty
      updatedProduct = await Product.findOneAndUpdate(
        {
          _id: product._id,
          stock: { $gte: qty },
          'variants._id': matchedVariant._id,
          'variants.stock': { $gte: qty }
        },
        {
          $inc: {
            stock: -qty,
            'variants.$.stock': -qty
          }
        },
        { new: true }
      );
    } else {
      // Atomic condition: product total stock >= qty
      updatedProduct = await Product.findOneAndUpdate(
        {
          _id: product._id,
          stock: { $gte: qty }
        },
        {
          $inc: {
            stock: -qty
          }
        },
        { new: true }
      );
    }

    if (!updatedProduct) {
      // CONCURRENCY RACE CONDITION PREVENTED!
      // Another user bought the item right at this millisecond.
      await rollbackStockDeduction(deductedItems);
      return {
        success: false,
        failedItem: item,
        error: `"${product.title}" ${item.size ? `(${item.size})` : ''} was just purchased by another shopper and is now out of stock.`
      };
    }

    deductedItems.push({
      productId: product._id,
      variantId: matchedVariant ? matchedVariant._id : null,
      quantity: qty
    });
  }

  return {
    success: true,
    deductedItems
  };
}

/**
 * Rolls back stock deductions if an order fails or cannot be completed.
 * Re-increments the exact variant and total stock atomically.
 *
 * @param {Array} deductedItems - Array of { productId, variantId, quantity }
 */
async function rollbackStockDeduction(deductedItems) {
  if (!Array.isArray(deductedItems) || deductedItems.length === 0) return;

  for (const entry of deductedItems) {
    try {
      if (entry.variantId) {
        await Product.updateOne(
          { _id: entry.productId, 'variants._id': entry.variantId },
          { $inc: { stock: entry.quantity, 'variants.$.stock': entry.quantity } }
        );
      } else {
        await Product.updateOne(
          { _id: entry.productId },
          { $inc: { stock: entry.quantity } }
        );
      }
    } catch (err) {
      console.error(`Error rolling back stock for product ${entry.productId}:`, err.message);
    }
  }
}

module.exports = {
  deductOrderStockAtomically,
  rollbackStockDeduction,
  norm
};
