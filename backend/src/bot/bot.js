import pkg from "whatsapp-web.js";
const { Client, RemoteAuth, MessageMedia } = pkg;
import { MongoStore } from "wwebjs-mongo";
import mongoose from "mongoose";
import qrcode from "qrcode-terminal";
import axios from "axios";

let client = null;
let currentQrUrl = null;
let botStatus = "aguardando_banco";
let clientReady = false;

let resolveReady;
let readyPromise = new Promise(res => { resolveReady = res; });

function criarCliente(store) {
    return new Client({
        authStrategy: new RemoteAuth({
            store,
            backupSyncIntervalMs: 300000, // salva sessao no MongoDB a cada 5 min
        }),
        authTimeoutMs: 90000,
        puppeteer: {
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--single-process",   // importante para ambientes com pouca memoria (Render free)
                "--disable-gpu"
            ],
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36"
        }
    });
}

function registrarEventos(c) {
    c.on("qr", qr => {
        console.log("--- NOVO QR CODE GERADO ---");
        currentQrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qr)}&size=300`;
        botStatus = "aguardando_qr";
        console.log("QR CODE DISPONIVEL - Acesse: https://promo-scda.onrender.com/api/bot/qr");
        try { qrcode.generate(qr, { small: true }); } catch (e) {}
    });

    c.on("authenticated", () => {
        botStatus = "autenticado";
        console.log("WhatsApp autenticado!");
    });

    c.on("remote_session_saved", () => {
        console.log("Sessao salva no MongoDB com sucesso!");
    });

    c.on("ready", () => {
        currentQrUrl = null;
        botStatus = "conectado";
        clientReady = true;
        resolveReady();
        console.log("BOT DO WHATSAPP ESTA PRONTO!");
    });

    c.on("auth_failure", (msg) => {
        botStatus = "erro_auth";
        console.error("Falha na autenticacao:", msg);
    });

    c.on("disconnected", async (reason) => {
        botStatus = "desconectado";
        clientReady = false;
        // Reseta a promise para o proximo ready
        readyPromise = new Promise(res => { resolveReady = res; });
        console.log("Bot desconectado:", reason);

        // Reconecta automaticamente apos 10 segundos, exceto em logout manual
        if (reason !== "LOGOUT") {
            console.log("Tentando reconectar em 10 segundos...");
            setTimeout(() => inicializarBot(), 10000);
        } else {
            console.log("Bot desconectado por LOGOUT. Escaneie o QR novamente em /api/bot/qr");
            botStatus = "aguardando_qr";
            // Em caso de logout, reinicia para gerar novo QR
            setTimeout(() => inicializarBot(), 5000);
        }
    });
}

export async function inicializarBot() {
    try {
        // Se ja existe um cliente, destroi antes de criar novo
        if (client) {
            try { await client.destroy(); } catch (e) {}
            client = null;
            clientReady = false;
        }

        if (mongoose.connection.readyState !== 1) {
            console.log("Aguardando conexao com MongoDB para inicializar o bot...");
            await new Promise((resolve, reject) => {
                mongoose.connection.once("open", resolve);
                mongoose.connection.once("error", reject);
            });
        }

        console.log("Inicializando RemoteAuth com MongoDB...");
        const store = new MongoStore({ mongoose });

        client = criarCliente(store);
        registrarEventos(client);

        // Captura erros do Puppeteer sem derrubar o processo
        client.pupPage?.on("error", err => {
            console.error("Erro na pagina do Puppeteer:", err.message);
        });

        await client.initialize();
        console.log("Cliente WhatsApp inicializado!");
    } catch (err) {
        console.error("Erro ao inicializar o bot:", err.message);
        // Tenta novamente em 30 segundos
        console.log("Tentando novamente em 30 segundos...");
        setTimeout(() => inicializarBot(), 30000);
    }
}

export function getQrUrl() { return currentQrUrl; }
export function getBotStatus() { return botStatus; }
export function isClientReady() { return clientReady; }

async function waitForClient(timeoutMs = 60000) {
    if (clientReady) return true;
    const timeout = new Promise((_, rej) =>
        setTimeout(() => rej(new Error("Timeout: cliente nao ficou pronto em " + (timeoutMs / 1000) + "s")), timeoutMs)
    );
    await Promise.race([readyPromise, timeout]);
    return true;
}

export async function enviarMensagem(produto, groupId) {
    if (!clientReady) {
        console.log("Cliente ainda nao esta pronto, aguardando...");
        await waitForClient(60000);
    }

    const resposta = await axios.get(produto.image_url, {
        responseType: "arraybuffer",
        timeout: 15000
    });

    const base64Image = Buffer.from(resposta.data, "binary").toString("base64");
    const media = new MessageMedia("image/jpeg", base64Image);

    let precoOriginalLinha = "";
    if (produto.price_original && produto.price_original > produto.price) {
        precoOriginalLinha = "DE: ~R$ " + produto.price_original + "~\n";
    }

    let precoAtualLinha = "";
    if (produto.price_original > produto.price) {
        precoAtualLinha = "POR: *R$ " + produto.price + "*\n";
    } else {
        precoAtualLinha = "Preco: R$ " + produto.price;
    }

    const mensagem = `*OFERTA ESPECIAL*\n\n*${produto.title}*\n\nLoja: *${produto.store}*\n${precoOriginalLinha}${precoAtualLinha}\n\nLink: ${produto.affiliate_url}`;

    await client.sendMessage(groupId, media, { caption: mensagem });
    console.log("Mensagem enviada: " + produto.title);
}
