import mongoose from "mongoose"

const ProductSchema = new mongoose.Schema({
  external_id: { type: String },      // ID do item no ML/Amazon/etc
  title: { type: String, required: true },
  store: { type: String, enum: ["mercadolivre", "amazon", "shopee", "magalu", "americanas", "outro"], required: true },

  original_url: { type: String, required: true },
  affiliate_url: { type: String },

  price: { type: Number },
  price_original: { type: Number },
  discount_percent: { type: Number },
  commission: {type: String},

  image_url: { type: String },

  source: { type: String, enum: ["manual", "scraping", "api"], required: true },

  categories: { type: String, required: true},
  slug: {type: String, unique: true },

}, { timestamps: true }); // createdAt, updatedAt

export default mongoose.model("Product", ProductSchema);