import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import axios from "axios";

const client = new Client({
    authStrategy: new LocalAuth(),
    authTimeoutMs: 60000,
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

let currentQrUrl = null;
let botStatus = "inicializando";
let clientReady = false;

// Promise que resolve quando o client estiver pronto
// Permite que enviarMensagem "aguarde" o cliente ficar ready
let resolveReady;
const readyPromise = new Promise(res => { resolveReady = res; });

client.on('qr', qr => {
    console.log('--- NOVO QR CODE GERADO ---');
    currentQrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qr)}&size=300`;
    botStatus = "aguardando_qr";

    console.log('\n⚠️  QR CODE DISPONÍVEL ⚠️');
    console.log('👉 Acesse o endpoint /api/bot/qr no seu navegador para escanear:');
    console.log(`   https://promo-scda.onrender.com/api/bot/qr`);
    console.log('\n-------------------------------------------');

    try { qrcode.generate(qr, { small: true }); } catch (e) {}
});

client.on('authenticated', () => {
    botStatus = "autenticado";
    console.log('✅ WhatsApp autenticado com sucesso!');
});

client.on('ready', () => {
    currentQrUrl = null;
    botStatus = "conectado";
    clientReady = true;
    resolveReady(); // libera qualquer envio que estava aguardando
    console.log('🟢 BOT DO WHATSAPP ESTÁ PRONTO!');
});

client.on('auth_failure', (msg) => {
    botStatus = "erro_auth";
    console.error('❌ Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
    botStatus = "desconectado";
    clientReady = false;
    console.log('🔴 Bot desconectado:', reason);
});

client.initialize();

export function getQrUrl() { return currentQrUrl; }
export function getBotStatus() { return botStatus; }
export function isClientReady() { return clientReady; }

// Aguarda o client ficar ready com timeout configurável
async function waitForClient(timeoutMs = 30000) {
    if (clientReady) return true;
    const timeout = new Promise((_, rej) =>
        setTimeout(() => rej(new Error(`Timeout: cliente não ficou pronto em ${timeoutMs / 1000}s`)), timeoutMs)
    );
    await Promise.race([readyPromise, timeout]);
    return true;
}

export async function enviarMensagem(produto, groupId) {
    try {
        // Garante que o client está pronto antes de tentar enviar
        if (!clientReady) {
            console.log("⏳ Cliente ainda não está pronto, aguardando...");
            await waitForClient(30000);
        }

        // Baixa a imagem do produto
        const resposta = await axios.get(produto.image_url, {
            responseType: "arraybuffer",
            timeout: 15000
        });

        const base64Image = Buffer.from(resposta.data, "binary").toString("base64");
        const media = new MessageMedia("image/jpeg", base64Image);

        // Monta o texto da mensagem
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
        console.log(`✅ Mensagem enviada para ${groupId}: ${produto.title}`);

    } catch (err) {
        console.error("❌ Erro ao enviar:", err.message);
        throw err; // propaga para a rota poder retornar erro adequado
    }
}
