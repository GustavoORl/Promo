import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import axios from "axios";

const client = new Client({
    // Estratégia de autenticação local
    authStrategy: new LocalAuth(),
    
    // Aumenta o tempo para autenticar (evita o erro de "não foi possível conectar")
    authTimeoutMs: 60000, 

    puppeteer: {
        headless: true,
        // Flags fundamentais para o Puppeteer funcionar no Render (Linux)
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
        // Simula um navegador comum para ser aceito pelo WhatsApp
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
    }
});

// Estado global do QR code (acessível pela rota HTTP)
let currentQrUrl = null;
let botStatus = "inicializando";

client.on('qr', qr => {
    console.log('--- NOVO QR CODE GERADO ---');
    
    // Gera URL do QR code via QuickChart (legível no navegador)
    currentQrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qr)}&size=300`;
    botStatus = "aguardando_qr";

    console.log('\n⚠️  QR CODE DISPONÍVEL ⚠️');
    console.log('👉 Acesse o endpoint /api/bot/qr no seu navegador para escanear:');
    console.log(`   https://promo-scda.onrender.com/api/bot/qr`);
    console.log('\n-------------------------------------------');
    
    // Tenta exibir no terminal mesmo sabendo que pode distorcer
    try {
        qrcode.generate(qr, { small: true });
    } catch (e) {
        // ignora erros de terminal
    }
});

client.on('ready', () => {
    currentQrUrl = null;
    botStatus = "conectado";
    console.log('BOT DO WHATSAPP ESTÁ PRONTO!');
});

client.on('authenticated', () => {
    botStatus = "autenticado";
    console.log('WhatsApp autenticado com sucesso!');
});

client.on('auth_failure', (msg) => {
    botStatus = "erro_auth";
    console.error('Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
    botStatus = "desconectado";
    console.log('Bot desconectado:', reason);
});

client.initialize();

// Exporta estado para uso nas rotas
export function getQrUrl() {
    return currentQrUrl;
}

export function getBotStatus() {
    return botStatus;
}

export async function enviarMensagem(produto, groupId) {
  try {
    const resposta = await axios.get(produto.image_url, {
      responseType: "arraybuffer"
    });

    const base64Image = Buffer.from(resposta.data, "binary").toString("base64");
    const media = new MessageMedia("image/jpeg", base64Image);

    // 👉 Só exibe preço original se for MAIOR que o preço atual
    let precoOriginalLinha = "";
    if (produto.price_original && produto.price_original > produto.price) {
      precoOriginalLinha = `❌ DE: ~R$ ${produto.price_original}~\n`;
    }

    let precoAtualLinha = "";
    if (produto.price_original > produto.price) {
      precoAtualLinha = `🔥 POR: *R$ ${produto.price}*\n`;
    } else {
      precoAtualLinha = `💰 Preço: ${produto.price}`;
    }

    // Mensagem final
    const mensagem = `
🔥 *OFERTA ESPECIAL* 🔥

🛒 *${produto.title}*

🏬 Loja: *${produto.store}*
${precoOriginalLinha}${precoAtualLinha}

🔗 Link: ${produto.affiliate_url}
    `;

    await client.sendMessage(groupId, media, { caption: mensagem });

    console.log("Mensagem enviada!");
  } catch (err) {
    console.log("Erro ao enviar:", err);
  }
}
