import Post from "../models/Post.js";

export async function newPost(req, res){
    try {
        const postagem = await Post.create(req.body);
        res.status(201).json(postagem);
    } catch (error) {
        res.status(400).json({error: error.message});
    }
}

export async function showPosts(req, res){
    try {
        const postagens = await Post.find().populate("produtoId");
        res.json(postagens);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
}

