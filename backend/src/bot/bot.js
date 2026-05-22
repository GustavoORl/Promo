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
let initTimeout = null;

let resolveReady;
let readyPromise = new Promise(res => { resolveReady = res; });

function criarCliente(store) {
    return new Client({
        authStrategy: new RemoteAuth({
            store,
            backupSyncIntervalMs: 300000,
        }),
        authTimeoutMs: 120000,
        puppeteer: {
            headless: true,
            // Flags otimizadas para Render — sem --single-process (causa travamento)
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--disable-gpu",
                "--no-first-run",
                "--disable-extensions",
                "--disable-background-networking",
                "--disable-default-apps",
                "--disable-sync",
                "--disable-translate",
                "--hide-scrollbars",
                "--metrics-recording-only",
                "--mute-audio",
                "--safebrowsing-disable-auto-update"
            ],
            timeout: 120000,
            userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36"
        }
    });
}

function registrarEventos(c) {
    c.on("qr", qr => {
        console.log("--- NOVO QR CODE GERADO ---");
        currentQrUrl = "https://quickchart.io/qr?text=" + encodeURIComponent(qr) + "&size=300";
        botStatus = "aguardando_qr";
        console.log("QR CODE DISPONIVEL - Acesse: https://promo-scda.onrender.com/api/bot/qr");
        try { qrcode.generate(qr, { small: true }); } catch (e) {}
    });

    c.on("authenticated", () => {
        botStatus = "autenticado";
        console.log("WhatsApp autenticado! Aguardando evento ready...");
    });

    c.on("remote_session_saved", () => {
        console.log("Sessao salva no MongoDB!");
    });

    c.on("ready", () => {
        // Cancela o timeout de watchdog se existir
        if (initTimeout) { clearTimeout(initTimeout); initTimeout = null; }

        currentQrUrl = null;
        botStatus = "conectado";
        clientReady = true;
        resolveReady();
        console.log("BOT DO WHATSAPP ESTA PRONTO!");
    });

    c.on("auth_failure", (msg) => {
        botStatus = "erro_auth";
        console.error("Falha na autenticacao:", msg);
        agendarReinicializacao(30000);
    });

    c.on("disconnected", (reason) => {
        if (initTimeout) { clearTimeout(initTimeout); initTimeout = null; }
        botStatus = "desconectado";
        clientReady = false;
        readyPromise = new Promise(res => { resolveReady = res; });
        console.log("Bot desconectado:", reason);
        agendarReinicializacao(reason === "LOGOUT" ? 5000 : 15000);
    });
}

function agendarReinicializacao(delay) {
    console.log("Reinicializando bot em " + (delay / 1000) + "s...");
    setTimeout(() => inicializarBot(), delay);
}

export async function inicializarBot() {
    try {
        if (client) {
            try { await client.destroy(); } catch (e) {}
            client = null;
            clientReady = false;
        }

        if (mongoose.connection.readyState !== 1) {
            console.log("Aguardando MongoDB...");
            await new Promise((resolve, reject) => {
                mongoose.connection.once("open", resolve);
                mongoose.connection.once("error", reject);
            });
        }

        console.log("Inicializando bot com RemoteAuth...");
        const store = new MongoStore({ mongoose });
        client = criarCliente(store);
        registrarEventos(client);

        // Watchdog: se apos 3 minutos ainda nao chegou o "ready", reinicia
        initTimeout = setTimeout(() => {
            if (!clientReady) {
                console.log("Watchdog: bot autenticou mas nao ficou pronto em 3min. Reiniciando...");
                agendarReinicializacao(5000);
            }
        }, 180000);

        await client.initialize();
        console.log("Cliente inicializado, aguardando evento ready...");
    } catch (err) {
        console.error("Erro ao inicializar o bot:", err.message);
        agendarReinicializacao(30000);
    }
}

export function getQrUrl() { return currentQrUrl; }
export function getBotStatus() { return botStatus; }
export function isClientReady() { return clientReady; }

export async function enviarMensagem(produto, groupId) {
    // Nao tenta aguardar — se nao esta pronto, falha imediatamente com erro claro
    if (!clientReady) {
        throw new Error("Bot nao esta pronto. Status atual: " + botStatus);
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

    let precoAtualLinha = (produto.price_original > produto.price)
        ? "POR: *R$ " + produto.price + "*\n"
        : "Preco: R$ " + produto.price;

    const mensagem = "*OFERTA ESPECIAL*\n\n*" + produto.title + "*\n\nLoja: *" + produto.store + "*\n" + precoOriginalLinha + precoAtualLinha + "\n\nLink: " + produto.affiliate_url;

    await client.sendMessage(groupId, media, { caption: mensagem });
    console.log("Mensagem enviada: " + produto.title);
}
