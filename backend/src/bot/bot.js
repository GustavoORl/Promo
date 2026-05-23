import makeWASocket, {
    DisconnectReason,
    fetchLatestBaileysVersion,
    initAuthCreds,
    BufferJSON,
    makeCacheableSignalKeyStore
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import mongoose from "mongoose";
import axios from "axios";
import pino from "pino";

// ─────────────────────────────────────────
// Schema MongoDB para salvar sessao Baileys
// ─────────────────────────────────────────
let AuthModel;
function getAuthModel() {
    if (AuthModel) return AuthModel;
    try { AuthModel = mongoose.model("WAuthState"); }
    catch { AuthModel = mongoose.model("WAuthState", new mongoose.Schema({ _id: String, value: String })); }
    return AuthModel;
}

async function writeData(id, data) {
    const value = JSON.stringify(data, BufferJSON.replacer);
    await getAuthModel().findByIdAndUpdate(id, { value }, { upsert: true, new: true });
}
async function readData(id) {
    const doc = await getAuthModel().findById(id);
    if (!doc) return null;
    try { return JSON.parse(doc.value, BufferJSON.reviver); } catch { return null; }
}
async function removeData(id) { await getAuthModel().findByIdAndDelete(id); }

async function useMongoAuthState() {
    const creds = (await readData("creds")) || initAuthCreds();
    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(ids.map(async id => {
                        const val = await readData(type + "-" + id);
                        if (val) data[id] = val;
                    }));
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const val = data[category][id];
                            tasks.push(val ? writeData(category + "-" + id, val) : removeData(category + "-" + id));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: async () => { await writeData("creds", creds); }
    };
}

// ─────────────────────────────────────────
// Modelos de mensagem
// ─────────────────────────────────────────

// Gatilhos de abertura aleatorios
const GATILHOS_COM_DESCONTO = [
    "⚡ *OFERTA RELÂMPAGO* ⚡",
    "🔥 *IMPERDÍVEL* 🔥",
    "🚨 *ALERTA DE PROMOÇÃO* 🚨",
    "💥 *PREÇO EXPLODIDO* 💥",
    "🎯 *OFERTA DO DIA* 🎯",
];

const GATILHOS_SEM_DESCONTO = [
    "🛒 *ACHADO DO DIA* 🛒",
    "✅ *BOA COMPRA* ✅",
    "💡 *DICA DE PRODUTO* 💡",
    "🌟 *PRODUTO EM DESTAQUE* 🌟",
    "📦 *CHEGOU NO GRUPO* 📦",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// 5 modelos para produto COM desconto
const MODELOS_COM_DESCONTO = [
    (p, gatilho) =>
`${gatilho}

🛍️ *${p.title}*

❌ De: ~${formatarPreco(p.price_original)}~
✅ Por: *${formatarPreco(p.price)}*

🔗 ${p.affiliate_url}

_Corra, pode acabar!_ ⏰`,

    (p, gatilho) =>
`${gatilho}

📌 *${p.title}*

💰 Antes: ~${formatarPreco(p.price_original)}~
🔥 AGORA: *${formatarPreco(p.price)}*

🏬 ${p.store}
👉 Garanta o seu: ${p.affiliate_url}`,

    (p, gatilho) =>
`${gatilho}

━━━━━━━━━━━━━━━━━━━
🛒 ${p.title}
━━━━━━━━━━━━━━━━━━━

💵 Preço original: ~${formatarPreco(p.price_original)}~
💥 Preço com desconto: *${formatarPreco(p.price)}*

📲 Comprar agora → ${p.affiliate_url}`,

    (p, gatilho) =>
`${gatilho}

✨ *${p.title}*

🏷️ De *${formatarPreco(p.price_original)}* por apenas *${formatarPreco(p.price)}*

⚠️ Promoção por tempo limitado!
🔗 Link: ${p.affiliate_url}`,

    (p, gatilho) =>
`${gatilho}

🎯 *${p.title}*

┌ 💳 De: ~${formatarPreco(p.price_original)}~
└ 💥 Por: *${formatarPreco(p.price)}*

🔗 Aproveite: ${p.affiliate_url}

_Não perca essa chance!_ 🏃`,
];

// 5 modelos para produto SEM desconto
const MODELOS_SEM_DESCONTO = [
    (p, gatilho) =>
`${gatilho}

🛍️ *${p.title}*

🏬 Loja: *${p.store}*
💰 Preço: *${formatarPreco(p.price)}*

🔗 ${p.affiliate_url}`,

    (p, gatilho) =>
`${gatilho}

📌 *${p.title}*

💵 Por *${formatarPreco(p.price)}* na *${p.store}*

👉 Confira: ${p.affiliate_url}`,

    (p, gatilho) =>
`${gatilho}

━━━━━━━━━━━━━━━━━━━
🛒 ${p.title}
━━━━━━━━━━━━━━━━━━━

💰 Preço: *${formatarPreco(p.price)}*
🏬 ${p.store}

📲 Ver produto → ${p.affiliate_url}`,

    (p, gatilho) =>
`${gatilho}

✨ *${p.title}*

🏷️ Disponível por *${formatarPreco(p.price)}* na *${p.store}*
🔗 Link: ${p.affiliate_url}`,

    (p, gatilho) =>
`${gatilho}

🎯 *${p.title}*

💳 Preço: *${formatarPreco(p.price)}*
🏬 Loja: ${p.store}

🔗 Confira: ${p.affiliate_url}

_Gostou? Compartilha com os amigos!_ 👇`,
];

function gerarMensagem(produto) {
    const temDesconto = produto.price_original && produto.price_original > produto.price;

    if (temDesconto) {
        const gatilho = pick(GATILHOS_COM_DESCONTO);
        const modelo = pick(MODELOS_COM_DESCONTO);
        return modelo(produto, gatilho);
    } else {
        const gatilho = pick(GATILHOS_SEM_DESCONTO);
        const modelo = pick(MODELOS_SEM_DESCONTO);
        return modelo(produto, gatilho);
    }
}

// ─────────────────────────────────────────
// Estado global do bot
// ─────────────────────────────────────────
let sock = null;
let currentQrUrl = null;
let botStatus = "aguardando_banco";
let clientReady = false;
let reconnectTimer = null;

export function getQrUrl() { return currentQrUrl; }
export function getBotStatus() { return botStatus; }
export function isClientReady() { return clientReady; }

function agendarReinicializacao(delayMs) {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    console.log("Reinicializando bot em " + (delayMs / 1000) + "s...");
    reconnectTimer = setTimeout(() => inicializarBot(), delayMs);
}

// ─────────────────────────────────────────
// Inicializacao do bot
// ─────────────────────────────────────────
export async function inicializarBot() {
    try {
        if (mongoose.connection.readyState !== 1) {
            console.log("Aguardando MongoDB...");
            await new Promise((resolve, reject) => {
                mongoose.connection.once("open", resolve);
                mongoose.connection.once("error", reject);
            });
        }

        console.log("Inicializando Baileys com sessao MongoDB...");
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMongoAuthState();

        sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
            },
            logger: pino({ level: "silent" }),
            printQRInTerminal: false,
            browser: ["PromoBot", "Chrome", "111.0.0"],
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            retryRequestDelayMs: 2000,
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                currentQrUrl = "https://quickchart.io/qr?text=" + encodeURIComponent(qr) + "&size=300";
                botStatus = "aguardando_qr";
                console.log("QR CODE DISPONIVEL - Acesse: https://promo-scda.onrender.com/api/bot/qr");
            }

            if (connection === "open") {
                currentQrUrl = null;
                botStatus = "conectado";
                clientReady = true;
                console.log("BOT DO WHATSAPP ESTA PRONTO!");
            }

            if (connection === "close") {
                clientReady = false;
                botStatus = "desconectado";
                const statusCode = (lastDisconnect?.error instanceof Boom)
                    ? lastDisconnect.error.output?.statusCode
                    : 0;

                console.log("Conexao encerrada. Codigo:", statusCode);

                if (statusCode === DisconnectReason.loggedOut) {
                    console.log("Logout detectado. Limpando sessao e reiniciando...");
                    getAuthModel().deleteMany({}).catch(() => {});
                    agendarReinicializacao(5000);
                } else {
                    agendarReinicializacao(10000);
                }
            }
        });

        console.log("Baileys inicializado com sucesso!");
    } catch (err) {
        console.error("Erro ao inicializar bot:", err.message);
        agendarReinicializacao(30000);
    }
}

// ─────────────────────────────────────────
// Envio de mensagem com imagem
// ─────────────────────────────────────────
export async function enviarMensagem(produto, groupId) {
    if (!clientReady || !sock) {
        throw new Error("Bot nao esta pronto. Status: " + botStatus);
    }

    // Baixa a imagem
    const resposta = await axios.get(produto.image_url, {
        responseType: "arraybuffer",
        timeout: 15000
    });
    const imageBuffer = Buffer.from(resposta.data);

    // Gera mensagem aleatoria
    const mensagem = gerarMensagem(produto);
    console.log("Modelo selecionado para:", produto.title);

    // Envia imagem + legenda
    await sock.sendMessage(groupId, {
        image: imageBuffer,
        caption: mensagem,
        mimetype: "image/jpeg"
    });

    console.log("Mensagem enviada: " + produto.title);
}