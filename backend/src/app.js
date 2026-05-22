import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import productsRoutes from "./routes/product.routes.js";
import postsRoutes from "./routes/post.routes.js";
import botRoutes from "./routes/bot.route.js";
import awinRoutes from "./routes/awin.route.js";
import shopeeRoutes from "./routes/shopee.route.js";
import { inicializarBot } from "./bot/bot.js";

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://gustavoOrl:Atumcaiu12@promo.q9dleu7.mongodb.net/?appName=Promo";

const app = express();

// CORS: permite o frontend do Vercel e localhost em dev
const allowedOrigins = [
    "https://promo-a267np6rp-gustavo-ribeiros-projects-e33bff59.vercel.app",
    "https://promo-scda.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000"
];

app.use(cors({
    origin: (origin, callback) => {
        // Permite requisicoes sem origin (ex: Postman, curl) e origens permitidas
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("CORS: origem nao permitida: " + origin));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

app.use(express.json());

app.use("/api/produtos", productsRoutes);
app.use("/api/postagens", postsRoutes);
app.use("/api/bot", botRoutes);
app.use("/api/awin/importar", awinRoutes);
app.use("/api/shopee", shopeeRoutes);

// Sobe o servidor ANTES de conectar ao banco
// para o Render detectar a porta e nao matar o processo
app.listen(PORT, () => {
    console.log("Server rodando na Porta " + PORT);
});

// Captura erros nao tratados para evitar crash do processo
process.on("uncaughtException", (err) => {
    console.error("Erro nao capturado:", err.message);
});

process.on("unhandledRejection", (reason) => {
    console.error("Promise rejeitada nao tratada:", reason);
});

// Conecta ao MongoDB com retry, depois inicializa o bot
async function connectDB() {
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            attempt++;
            console.log("Tentando conectar ao MongoDB (tentativa " + attempt + "/" + maxRetries + ")...");
            await mongoose.connect(MONGO_URI);
            console.log("MongoDB conectado com sucesso!");

            // Inicia cron e bot apenas apos o banco estar pronto
            await import("./crons/botCron.js");
            await inicializarBot();
            return;
        } catch (err) {
            console.error("Erro ao conectar ao MongoDB:", err.message);
            if (attempt < maxRetries) {
                const delay = attempt * 3000;
                console.log("Aguardando " + (delay / 1000) + "s antes de tentar novamente...");
                await new Promise(res => setTimeout(res, delay));
            } else {
                console.error("Nao foi possivel conectar ao MongoDB apos todas as tentativas.");
            }
        }
    }
}

connectDB();
