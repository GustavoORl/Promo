import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import QRCodeLib from 'qrcode'; // Biblioteca para gerar base64
import axios from "axios";

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true
    }
});

// Evento QR
client.on('qr', async qr => {
    console.log('QR RECEBIDO (ASCII local, se terminal suportar):');
    qrcode.generate(qr, { small: true });

    try {
        // Gera QR Code como URL base64
        const qrBase64 = await QRCodeLib.toDataURL(qr);
        console.log('QR Code Base64 (abra no navegador para escanear):');
        console.log(qrBase64);
    } catch (err) {
        console.log('Erro ao gerar QR Code base64:', err);
    }
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

    // Só exibe preço original se for MAIOR que o preço atual
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
