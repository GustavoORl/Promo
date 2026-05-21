import express from "express";
import Product from "../models/Product.js";
import Queue from "../models/Queue.js";
import { enviarMensagem, getQrUrl, getBotStatus } from "../bot/bot.js";

const router = express.Router();

// ===========================
// ROTA QR CODE (para escanear no navegador)
// Acesse: https://SEU-BACKEND.onrender.com/api/bot/qr
// ===========================
router.get("/qr", (req, res) => {
    const qrUrl = getQrUrl();
    const status = getBotStatus();

    if (status === "conectado" || status === "autenticado") {
        return res.send(`
            <html>
                <body style="font-family:sans-serif;text-align:center;padding:40px">
                    <h2 style="color:green">✅ Bot já está conectado!</h2>
                    <p>Status: <strong>${status}</strong></p>
                </body>
            </html>
        `);
    }

    if (!qrUrl) {
        return res.send(`
            <html>
                <body style="font-family:sans-serif;text-align:center;padding:40px">
                    <h2>⏳ QR Code ainda não foi gerado</h2>
                    <p>Status: <strong>${status}</strong></p>
                    <p>Aguarde alguns segundos e atualize a página.</p>
                    <script>setTimeout(() => location.reload(), 5000);</script>
                </body>
            </html>
        `);
    }

    return res.send(`
        <html>
            <body style="font-family:sans-serif;text-align:center;padding:40px;background:#f5f5f5">
                <h2>📱 Escaneie o QR Code com o WhatsApp</h2>
                <p>Status: <strong>${status}</strong></p>
                <img src="${qrUrl}" alt="QR Code" style="border:4px solid #25D366;border-radius:12px;padding:10px;background:white"/>
                <p style="color:#666">Esta página atualiza automaticamente a cada 30 segundos.</p>
                <script>setTimeout(() => location.reload(), 30000);</script>
            </body>
        </html>
    `);
});

// ===========================
// STATUS DO BOT
// ===========================
router.get("/status", (req, res) => {
    res.json({
        status: getBotStatus(),
        qrDisponivel: !!getQrUrl()
    });
});

// ===========================
// ROTA PARA ENVIAR MÚLTIPLOS PRODUTOS
// ===========================
router.post("/enviar", async (req, res) => {
    try {
        const { produtos, chatId } = req.body;

        if (!produtos || !chatId) {
            return res.status(400).json({ error: "produtos[] e chatId são obrigatórios" });
        }

        const produtosData = await Product.find({ _id: { $in: produtos } });

        if (!produtosData.length) {
            return res.status(404).json({ error: "Nenhum produto encontrado" });
        }

        for (const p of produtosData) {
            await enviarMensagem(p, chatId);
        }

        return res.json({ message: "Mensagens enviadas!" });

    } catch (e) {
        console.log(e);
        res.status(500).json({ error: "Erro ao enviar mensagens" });
    }
});

// ===========================
// ADICIONAR PRODUTOS À FILA
// ===========================
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
