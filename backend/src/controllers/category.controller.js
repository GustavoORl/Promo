import Category from "../models/Category.js";

export async function createCategory(req, res){
    try {
        const category = await Category.crete(req.body);
        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
}


export async function showCategory (req, res) {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar categorias" });
  }
};


