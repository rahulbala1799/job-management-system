const mongoose = require('mongoose');

// Base schema for all products
const baseProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['packaging', 'wide_format', 'leaflets']
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
});

// Create the base model
const BaseProduct = mongoose.model('Product', baseProductSchema);

// Packaging product schema
const packagingSchema = new mongoose.Schema({
  product_code: { type: String, required: true },
  unit_type: { 
    type: String, 
    required: true,
    enum: ['boxed', 'units']
  },
  units_per_box: { 
    type: Number,
    required: function() { return this.unit_type === 'boxed'; }
  },
  box_cost: { 
    type: Number,
    required: function() { return this.unit_type === 'boxed'; }
  },
  unit_cost: { type: Number, required: true }
});

// Wide format product schema
const wideFormatSchema = new mongoose.Schema({
  material: { type: String, required: true },
  width_m: { type: Number, required: true },
  length_m: { type: Number, required: true },
  roll_cost: { type: Number, required: true },
  cost_per_sqm: { type: Number, required: true }
});

// Leaflets product schema
const leafletsSchema = new mongoose.Schema({
  material: { type: String, required: true },
  thickness: { type: String, required: true },
  cost_per_unit: { type: Number, required: true }
});

// Create discriminator models
const PackagingProduct = BaseProduct.discriminator('PackagingProduct', packagingSchema);
const WideFormatProduct = BaseProduct.discriminator('WideFormatProduct', wideFormatSchema);
const LeafletsProduct = BaseProduct.discriminator('LeafletsProduct', leafletsSchema);

module.exports = {
  BaseProduct,
  PackagingProduct,
  WideFormatProduct,
  LeafletsProduct
}; 