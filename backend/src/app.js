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

app.use(cors({
    origin: (origin, callback) => {
        // Sem origin: Postman, curl, chamadas server-to-server
        if (!origin) return callback(null, true);

        // Aceita qualquer subdominio *.vercel.app (todos os deploys do seu projeto)
        if (origin.endsWith(".vercel.app") || origin.endsWith(".onrender.com")) {
            return callback(null, true);
        }

        // Aceita localhost para desenvolvimento
        if (origin.startsWith("http://localhost:")) {
            return callback(null, true);
        }

        console.warn("CORS bloqueado para origem:", origin);
        callback(new Error("CORS: origem nao permitida: " + origin));
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

app.listen(PORT, () => {
    console.log("Server rodando na Porta " + PORT);
});

process.on("uncaughtException", (err) => {
    console.error("Erro nao capturado:", err.message);
});

process.on("unhandledRejection", (reason) => {
    console.error("Promise rejeitada nao tratada:", reason);
});

async function connectDB() {
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            attempt++;
            console.log("Tentando conectar ao MongoDB (tentativa " + attempt + "/" + maxRetries + ")...");
            await mongoose.connect(MONGO_URI);
            console.log("MongoDB conectado com sucesso!");
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
