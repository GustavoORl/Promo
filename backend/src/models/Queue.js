import mongoose from "mongoose";

const QueueSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    status: { type: String, default: "pendente" },
    addedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Queue", QueueSchema);
