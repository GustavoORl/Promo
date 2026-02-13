// src/services/shopee.service.js
import Product from "../models/Product.js";
import { fetchShopeeOffers } from "../api/shopee.api.js";

export async function importShopeeProducts() {
  const shopeeData = await fetchShopeeOffers();

  if (!shopeeData || shopeeData.errors) {
    console.error("Erro nos dados da Shopee:", shopeeData);
    return;
  }

  const products = shopeeData.data.shopOfferV2.nodes;

  for (const item of products) {
    try {
      await Product.findOneAndUpdate(
        { external_id: item.offerId, store: "shopee" },
        {
          external_id: item.offerId,
          title: item.offerName,
          store: "shopee",

          original_url: item.offerLink,
          affiliate_url: item.offerLink,

          price: item.price,
          price_original: item.priceBeforeDiscount,
          discount_percent: item.discount,
          commission: item.commission,

          image_url: item.imageUrl,

          source: "api",

          categories: "shopee", // coloquei algo fixo até você decidir
        },
        { upsert: true, new: true }
      );

    } catch (error) {
      console.error("Erro ao salvar produto:", error);
    }
  }

  console.log("Produtos da Shopee importados com sucesso!");
}
