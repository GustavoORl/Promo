import Product from "../models/Product.js";

export async function newProduct(req, res){
    try {
        const produtos = await Product.create(req.body);
        res.status(201).json(produtos);
    } catch (error) {
        res.status(400).json({error: error.message});
    }
}

export async function showProducts(req, res){
    try {
        const produtos = await Product.find().populate("categories");
        res.json(produtos);
    } catch (error) {
        res.status(500).json({error: message.error});
    }
}

export async function showProduct(req, res){
    try {
        const produto = await Product.findById(req.params.id);
        res.json(produto);
    } catch (error) {
        res.status(404).json({error: "Produto não encontrado"});
    }
}

export async function updateProduct(req, res){
    try {
        const produto = await Product.findByIdAndUpdate(req.params.id, req.body, {new:true});
        res.json(produto);
    } catch (error) {
        res.status(400).json({error: error.message});
    }
}

export async function deleteProduct(req, res){
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({message: "Produto removido"});
    } catch (error) {
        res.status(400).json({error: error.message})
    }
}