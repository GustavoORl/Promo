// src/services/shopee.update.service.js
import Product from "../models/Product.js";
import { fetchShopeeOffers } from "./shopee.api.js";

export async function updateShopeeProducts() {
  try {
    console.log("🔄 Atualizando produtos da Shopee...");

    const products = await fetchShopeeOffers();

    if (!products || !products.nodes) {
      console.log("⚠ Nenhum dado retornado da API");
      return;
    }

    for (const item of products.nodes) {
      const data = {
        external_id: item.itemId.toString(),
        title: item.productName,
        store: "shopee",
        original_url: item.productLink,
        affiliate_url: item.offerLink,
        price: parseFloat(item.priceMin || 0),
        price_original: parseFloat(item.priceMax || 0),
        discount_percent: item.priceDiscountRate || 0,
        commission: item.commission,
        image_url: item.imageUrl,
        source: "api",
        categories: (item.productCatIds || []).join(","),
      };

      // Atualiza se existir, senão cria
      await Product.findOneAndUpdate(
        { external_id: data.external_id, store: "shopee" },
        data,
        { upsert: true, new: true }
      );
    }

    console.log("✅ Atualização Shopee finalizada!");

  } catch (err) {
    console.error("❌ Erro ao atualizar produtos da Shopee:", err);
  }
}
