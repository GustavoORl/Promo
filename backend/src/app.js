import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
dotenv.config();

import productsRoutes from "./routes/product.routes.js"
import postsRoutes from "./routes/post.routes.js"
import botRoutes from "./routes/bot.route.js"
import awinRoutes from "./routes/awin.route.js"
import shopeeRoutes from "./routes/shopee.route.js"
import { inicializarBot } from "./bot/bot.js"

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://gustavoOrl:Atumcaiu12@promo.q9dleu7.mongodb.net/?appName=Promo";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/produtos", productsRoutes);
app.use("/api/postagens", postsRoutes);
app.use("/api/bot", botRoutes);
app.use("/api/awin/importar", awinRoutes);
app.use("/api/shopee", shopeeRoutes);

// Sobe o servidor ANTES de conectar ao banco
// para o Render detectar a porta e não matar o processo
app.listen(PORT, () => {
    console.log(`Server rodando na Porta ${PORT}`);
});

// Conecta ao MongoDB com retry, depois inicializa o bot
async function connectDB() {
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            attempt++;
            console.log(`🔄 Tentando conectar ao MongoDB (tentativa ${attempt}/${maxRetries})...`);
            await mongoose.connect(MONGO_URI);
            console.log("✅ MongoDB conectado com sucesso!");

            // Inicia cron e bot apenas após o banco estar pronto
            await import("./crons/botCron.js");
            await inicializarBot();
            return;
        } catch (err) {
            console.error(`❌ Erro ao conectar ao MongoDB:`, err.message);
            if (attempt < maxRetries) {
                const delay = attempt * 3000;
                console.log(`⏳ Aguardando ${delay / 1000}s antes de tentar novamente...`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                console.error("💀 Não foi possível conectar ao MongoDB após todas as tentativas.");
            }
        }
    }
}

connectDB();
