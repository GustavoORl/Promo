import express from "express";
import Product from "../models/Product.js";
import Queue from "../models/Queue.js";
import { enviarMensagem, isBotReady } from "../bot/bot.js";

const router = express.Router();

// ROTA PARA ENVIAR MÚLTIPLOS PRODUTOS
router.post("/enviar", async (req, res) => {
    try {
       if (!isBotReady()) {
            return res.status(503).json({
                error: "O bot ainda não está conectado ao WhatsApp"
            });
        }
        const { produtos, chatId } = req.body;

        if (!produtos || !chatId) {
            return res.status(400).json({ error: "produtos[] e chatId são obrigatórios" });
        }

        // Buscar produtos pelo ID
        const produtosData = await Product.find({ _id: { $in: produtos } });

        if (!produtosData.length) {
            return res.status(404).json({ error: "Nenhum produto encontrado" });
        }

        // Enviar mensagem para cada produto
        for (const p of produtosData) {
            await enviarMensagem(p, chatId);
        }

        return res.json({ message: "Mensagens enviadas!" });

    } catch (e) {
        console.log(e);
        res.status(500).json({ error: "Erro ao enviar mensagens" });
    }
});

// adicionar produtos à fila
router.post("/fila", async (req, res) => {
  const { produtos } = req.body;

  if (!produtos || produtos.length === 0) {
    return res.status(400).json({ error: "Nenhum produto enviado." });
  }

  try {
    for (const id of produtos) {
      await Queue.create({ productId: id });
    }

    res.json({
      success: true,
      adicionados: produtos.length,
      message: "Produtos adicionados à fila!"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao adicionar à fila." });
  }
});

export default router;