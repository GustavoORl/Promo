import cron from "node-cron";
import Queue from "../models/Queue.js";
import Product from "../models/Product.js";
import { enviarMensagem } from "../bot/bot.js";

const GROUP_ID = "120363422814810115@g.us";

// Roda a cada 7 minutos 
cron.schedule("*/6 * * * *", async () => {
  console.log("⏳ Cron Job: buscando proximo item da fila...");
  try { // pega os 2 itens pendentes mais antigos 
    const itens = await Queue.find({ status: "pendente" })
      .sort({ addedAt: 1 })
      .limit(1);
    if (!itens.length) {
      console.log("Nenhum item na fila.");
      return;
    }
    console.log(`📦 Encontrados ${ itens.length } itens para enviar`);
    for (const item of itens) {
      const product = await Product.findById(item.productId);
      if (!product) {
        console.log("❌ Produto não encontrado, removendo da fila...");
        await Queue.deleteOne({ _id: item._id });
        continue;
      } // envia mensagem pelo bot 
      await enviarMensagem(product, GROUP_ID);
      // marca como enviado 
      item.status = "enviado"; await item.save();
      console.log("✔ Produto enviado:", product.title);
    }
  } catch (err) {
    console.error("🔥 Erro no cron job:", err);
  }
});