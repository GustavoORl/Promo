import express from "express";
import Product from "../models/Product.js";
import Queue from "../models/Queue.js";
import { enviarMensagem, getQrUrl, getBotStatus, isClientReady } from "../bot/bot.js";

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

        // Verifica se o bot está conectado antes de buscar produtos
        if (!isClientReady()) {
            const status = getBotStatus();
            if (status === "aguardando_qr" || status === "inicializando") {
                return res.status(503).json({
                    error: "Bot ainda não está conectado ao WhatsApp.",
                    status,
                    instrucao: "Escaneie o QR code em /api/bot/qr e aguarde o status 'conectado'."
                });
            }
        }

        const produtosData = await Product.find({ _id: { $in: produtos } });

        if (!produtosData.length) {
            return res.status(404).json({ error: "Nenhum produto encontrado" });
        }

        const resultados = [];
        for (const p of produtosData) {
            try {
                await enviarMensagem(p, chatId);
                resultados.push({ id: p._id, titulo: p.title, ok: true });
                // Pequena pausa entre envios para não ser bloqueado
                await new Promise(res => setTimeout(res, 1500));
            } catch (err) {
                resultados.push({ id: p._id, titulo: p.title, ok: false, erro: err.message });
            }
        }

        const enviados = resultados.filter(r => r.ok).length;
        const falhas = resultados.filter(r => !r.ok).length;

        return res.json({
            message: `${enviados} mensagem(ns) enviada(s), ${falhas} falha(s).`,
            resultados
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao enviar mensagens", detalhe: e.message });
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
