import mongoose from "mongoose"

const PostagemSchema = new mongoose.Schema({
    produtoId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    nomeProduto: {type: mongoose.Schema.Types.ObjectId, ref: "Product"},
    loja: {type: mongoose.Schema.Types.ObjectId, ref: "Product"},
    imagemPostada: { type: String },
    horario: { type: Date, default: Date.now },
    grupo: { type: String } // exemplo: grupo do WhatsApp onde foi postado
});

export default mongoose.model("Post", PostagemSchema);