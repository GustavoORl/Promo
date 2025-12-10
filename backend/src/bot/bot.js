import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import axios from "axios";

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true
    }
});

client.on('qr', qr => {
    console.log('QR RECEBIDO: ');
    qrcode.generate(qr, { small: true });
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



//SCRIPT PARA SABER O ID DE UM GRUPO
// client.on('ready', async () => {
//     console.log("Bot conectado!");

//     const chats = await client.getChats();

//     const grupos = chats.filter(c => c.isGroup);

//     console.log("=== GRUPOS ENCONTRADOS ===");
//     grupos.forEach(g => {
//         console.log(`Nome: ${g.name} | ID: ${g.id._serialized}`);
//     });
// });