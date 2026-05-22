import pkg from 'whatsapp-web.js';
const { Client, RemoteAuth, MessageMedia } = pkg;
import { MongoStore } from 'wwebjs-mongo';
import mongoose from 'mongoose';
import qrcode from 'qrcode-terminal';
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
            backupSyncIntervalMs: 300000, // salva sessão no MongoDB a cada 5 min
        }),
        authTimeoutMs: 90000,
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ],
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
        }
    });
}

function registrarEventos(c) {
    c.on('qr', qr => {
        console.log('--- NOVO QR CODE GERADO ---');
        currentQrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qr)}&size=300`;
        botStatus = "aguardando_qr";

        console.log('\n⚠️  QR CODE DISPONÍVEL ⚠️');
        console.log('👉 Acesse: https://promo-scda.onrender.com/api/bot/qr');
        console.log('\n-------------------------------------------');
        try { qrcode.generate(qr, { small: true }); } catch (e) {}
    });

    c.on('authenticated', () => {
        botStatus = "autenticado";
        console.log('✅ WhatsApp autenticado!');
    });

    c.on('remote_session_saved', () => {
        console.log('💾 Sessão salva no MongoDB com sucesso!');
    });

    c.on('ready', () => {
        currentQrUrl = null;
        botStatus = "conectado";
        clientReady = true;
        resolveReady();
        console.log('🟢 BOT DO WHATSAPP ESTÁ PRONTO!');
    });

    c.on('auth_failure', (msg) => {
        botStatus = "erro_auth";
        console.error('❌ Falha na autenticação:', msg);
    });

    c.on('disconnected', (reason) => {
        botStatus = "desconectado";
        clientReady = false;
        // Reseta a promise para o próximo ready
        readyPromise = new Promise(res => { resolveReady = res; });
        console.log('🔴 Bot desconectado:', reason);
    });
}

// Inicializa o bot assim que o mongoose estiver conectado
export async function inicializarBot() {
    try {
        // Aguarda mongoose estar conectado (pode já estar)
        if (mongoose.connection.readyState !== 1) {
            console.log('⏳ Aguardando conexão com MongoDB para inicializar o bot...');
            await new Promise((resolve, reject) => {
                mongoose.connection.once('open', resolve);
                mongoose.connection.once('error', reject);
            });
        }

        console.log('🔄 Inicializando RemoteAuth com MongoDB...');
        const store = new MongoStore({ mongoose });

        client = criarCliente(store);
        registrarEventos(client);
        await client.initialize();

        console.log('🚀 Cliente WhatsApp inicializado!');
    } catch (err) {
        console.error('❌ Erro ao inicializar o bot:', err.message);
    }
}

export function getQrUrl() { return currentQrUrl; }
export function getBotStatus() { return botStatus; }
export function isClientReady() { return clientReady; }

async function waitForClient(timeoutMs = 60000) {
    if (clientReady) return true;
    const timeout = new Promise((_, rej) =>
        setTimeout(() => rej(new Error(`Timeout: cliente não ficou pronto em ${timeoutMs / 1000}s`)), timeoutMs)
    );
    await Promise.race([readyPromise, timeout]);
    return true;
}

export async function enviarMensagem(produto, groupId) {
    if (!clientReady) {
        console.log("⏳ Cliente ainda não está pronto, aguardando...");
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
        precoOriginalLinha = `❌ DE: ~R$ ${produto.price_original}~\n`;
    }

    let precoAtualLinha = "";
    if (produto.price_original > produto.price) {
        precoAtualLinha = `🔥 POR: *R$ ${produto.price}*\n`;
    } else {
        precoAtualLinha = `💰 Preço: R$ ${produto.price}`;
    }

    const mensagem = `🔥 *OFERTA ESPECIAL* 🔥\n\n🛒 *${produto.title}*\n\n🏬 Loja: *${produto.store}*\n${precoOriginalLinha}${precoAtualLinha}\n\n🔗 Link: ${produto.affiliate_url}`;

    await client.sendMessage(groupId, media, { caption: mensagem });
    console.log(`✅ Mensagem enviada: ${produto.title}`);
}
