const express = require('express');
const router = express.Router();
const { BaseProduct, PackagingProduct, WideFormatProduct, LeafletsProduct } = require('../models/Product');
const auth = require('../middleware/auth');

// Get all products
router.get('/', auth, async (req, res) => {
  try {
    const products = await BaseProduct.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get products by category
router.get('/category/:category', auth, async (req, res) => {
  try {
    const products = await BaseProduct.find({ category: req.params.category });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new product
router.post('/', auth, async (req, res) => {
  try {
    let product;
    const { category } = req.body;

    switch (category) {
      case 'packaging':
        product = new PackagingProduct(req.body);
        break;
      case 'wide_format':
        // Calculate cost per square meter
        const { roll_cost, width_m, length_m } = req.body;
        const cost_per_sqm = roll_cost / (width_m * length_m);
        product = new WideFormatProduct({ ...req.body, cost_per_sqm });
        break;
      case 'leaflets':
        product = new LeafletsProduct(req.body);
        break;
      default:
        return res.status(400).json({ message: 'Invalid product category' });
    }

    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a product
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await BaseProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // If updating a wide format product, recalculate cost per square meter
    if (req.body.category === 'wide_format' && 
        (req.body.roll_cost !== undefined || 
         req.body.width_m !== undefined || 
         req.body.length_m !== undefined)) {
      const roll_cost = req.body.roll_cost ?? product.roll_cost;
      const width_m = req.body.width_m ?? product.width_m;
      const length_m = req.body.length_m ?? product.length_m;
      req.body.cost_per_sqm = roll_cost / (width_m * length_m);
    }

    Object.assign(product, req.body);
    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a product
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await BaseProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 