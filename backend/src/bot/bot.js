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

client.on('qr', qr => {
    console.log('--- NOVO QR CODE GERADO ---');
    
    // 1. Tenta mostrar no terminal (mesmo que saia torto, serve de aviso)
    qrcode.generate(qr, { small: false });

    // 2. NOVO LINK (QuickChart API) - Mais estável que o Google
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qr)}&size=300`;
    
    console.log('\n⚠️ O LOG DO RENDER DISTORCE O QR CODE ACIMA ⚠️');
    console.log('👉 COPIE E COLE ESTE LINK NO NAVEGADOR PARA ESCANEAR:');
    console.log(qrUrl);
    console.log('\n-------------------------------------------');
});

client.on('ready', () => {
    console.log('BOT DO WHATSAPP ESTÁ PRONTO!');
});

client.initialize();

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
      precoAtualLinha = `🔥 POR: *R$ ${produto.price}*\n`
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

function montarMensagem(produto) {
  let msg = `🔥 *OFERTA IMPERDÍVEL*\n\n`;
  msg += `📦 ${produto.title}\n`;

  if (produto.price_original) {
    msg += `❌ De: ${produto.price_original}\n`;
  }

  if (produto.price) {
    msg += `✅ Por: *${produto.price}*\n`;
  }

  msg += `\n👉 ${produto.affiliate_url}`;

  return msg;
}


// SCRIPT PARA SABER O ID DE UM GRUPO
// client.on('ready', async () => {
//     console.log("Bot conectado!");

//     const chats = await client.getChats();

//     const grupos = chats.filter(c => c.isGroup);

//     console.log("=== GRUPOS ENCONTRADOS ===");
//     grupos.forEach(g => {
//         console.log(`Nome: ${g.name} | ID: ${g.id._serialized}`);
//     });
// });