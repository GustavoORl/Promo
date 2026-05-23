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
    try {
        AuthModel = mongoose.model("WAuthState");
    } catch {
        AuthModel = mongoose.model("WAuthState", new mongoose.Schema({
            _id: String,
            value: String
        }));
    }
    return AuthModel;
}

async function writeData(id, data) {
    const Model = getAuthModel();
    const value = JSON.stringify(data, BufferJSON.replacer);
    await Model.findByIdAndUpdate(id, { value }, { upsert: true, new: true });
}

async function readData(id) {
    const Model = getAuthModel();
    const doc = await Model.findById(id);
    if (!doc) return null;
    try { return JSON.parse(doc.value, BufferJSON.reviver); } catch { return null; }
}

async function removeData(id) {
    const Model = getAuthModel();
    await Model.findByIdAndDelete(id);
}

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
                            const key = category + "-" + id;
                            tasks.push(val ? writeData(key, val) : removeData(key));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: async () => {
            await writeData("creds", creds);
        }
    };
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
            printQRInTerminal: false,  // geramos a URL manualmente
            browser: ["PromoBot", "Chrome", "111.0.0"],
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            retryRequestDelayMs: 2000,
        });

        // Salva credenciais sempre que atualizarem
        sock.ev.on("creds.update", saveCreds);

        // Eventos de conexao
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

                // 401 = LoggedOut (precisa de novo QR)
                // Qualquer outro = tenta reconectar
                if (statusCode === DisconnectReason.loggedOut) {
                    console.log("Sessao encerrada (logout). Limpando credenciais e reiniciando...");
                    // Limpa sessao do MongoDB para forcar novo QR
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

    // Monta o texto
    let precoOriginalLinha = "";
    if (produto.price_original && produto.price_original > produto.price) {
        precoOriginalLinha = "DE: ~R$ " + produto.price_original + "~\n";
    }
    const precoAtualLinha = (produto.price_original > produto.price)
        ? "POR: *R$ " + produto.price + "*\n"
        : "Preco: R$ " + produto.price;

    const mensagem = "*OFERTA ESPECIAL*\n\n*" + produto.title + "*\n\nLoja: *" + produto.store + "*\n" + precoOriginalLinha + precoAtualLinha + "\n\nLink: " + produto.affiliate_url;

    // Envia imagem com legenda
    await sock.sendMessage(groupId, {
        image: imageBuffer,
        caption: mensagem,
        mimetype: "image/jpeg"
    });

    console.log("Mensagem enviada: " + produto.title);
}
