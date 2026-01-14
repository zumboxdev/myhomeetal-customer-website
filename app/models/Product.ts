import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  productTitle: string;
  review?: string[];
  price: string;
  category: {
    _id: string;
    name: string;
  } | string;
  subCategory: {
    _id: string;
    name: string;
  } | string;
  description: string;
  images: string[];
  isProductNew?: boolean;
  inventory: {
    _id: string;
    quantity: number;
  } | string;
  brand?: string;
  weight?: string;
  modelNumber?: string;
  mainMaterial?: string;
  color?: string;
  keyFeatures?: string[];
  sku?: string;
  size?: string;
  createdOn?: string;
  createdBy?: string;
  updatedOn?: string;
  updatedBy?: string;
}

const ProductSchema = new Schema<IProduct>(
  {
    productTitle: {
      type: String,
      required: true,
      index: true,
    },
    review: [{
      type: Schema.Types.ObjectId,
      ref: 'Review',
      required: false,
    }],
    price: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'ProductCategory',
      required: true,
    },
    subCategory: {
      type: Schema.Types.ObjectId,
      ref: 'ProductSubCategory',
      required: true,
    },
    description: {
      type: String,
      required: true,
      index: true,
    },
    images: [{
      type: String,
      required: true,
    }],
    isProductNew: {
      type: Boolean,
    },
    inventory: {
      type: Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true,
    },
    brand: {
      type: String,
      index: true,
    },
    weight: {
      type: String,
    },
    modelNumber: {
      type: String,
    },
    mainMaterial: {
      type: String,
    },
    color: {
      type: String,
      index: true,
    },
    keyFeatures: [{
      type: String,
    }],
    sku: {
      type: String,
    },
    size: {
      type: String,
    },
    createdOn: {
      type: String,
    },
    createdBy: {
      type: String,
    },
    updatedOn: {
      type: String,
    },
    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: false, // Using custom createdOn/updatedOn
  }
);

// Create text index for full-text search
ProductSchema.index({
  productTitle: 'text',
  description: 'text',
  brand: 'text',
  keyFeatures: 'text',
});

// Compound indexes for common queries
ProductSchema.index({ brand: 1, price: 1 });
ProductSchema.index({ category: 1, price: 1 });
ProductSchema.index({ color: 1 });
ProductSchema.index({ isProductNew: 1 });

const Product: Model<IProduct> = 
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
