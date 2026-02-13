import express from "express";
import slugify from "slugify";
import Product from "../models/Product.js";
import { fetchShopeeOffers, fetchShopeeCustomLimit } from "../api/shopee.api.js";
import { updateShopeeProducts } from "../api/shopee.update.js";

const router = express.Router();

/* ===========================
   NORMALIZAR TÍTULO
   remove 2x, 3x, promo, kit, etc.
=========================== */
function normalizeTitle(title) {
    return title
        .toLowerCase()

        // remove "2x", "3x", etc
        .replace(/^\d+x\s*/g, "")

        // remove promoções
        .replace(/promo(ção)?/g, "")

        // remove KIT / KIt / kit
        .replace(/\bkit\b/g, "")

        // remove caracteres especiais
        .replace(/[^\w\s]/g, "")

        // remove espaços duplos
        .replace(/\s+/g, " ")

        .trim();
}

/* ===========================
   PALAVRAS BLOQUEADAS
=========================== */
const blockedKeywords = [
    "tenis", "tnis", "tênis"
];

/* ===========================
   IMPORTAR PRODUTOS
=========================== */
router.get("/import", async (req, res) => {
    const keyword = req.query.keyword;
    const limit = req.query.limit || 5;
    const data = await fetchShopeeOffers(keyword, limit);

    if (!data || data.errors) {
        return res.status(400).json({ error: data.errors });
    }

    const nodes = data.data.productOfferV2.nodes;

    let imported = 0;
    let skippedBlocked = 0;
    let skippedDuplicate = 0;

    try {
        for (const item of nodes) {
            const normalized = normalizeTitle(item.productName);
            const slug = slugify(normalized, { lower: true, strict: true });

            // ❌ Bloqueia roupas
            if (blockedKeywords.some(word => normalized.includes(word))) {
                console.log("Ignorando item bloqueado:", item.productName, " - ", item.productCatIds);
                skippedBlocked++;
                continue;
            }

            // 🔍 Verifica se produto com este slug já existe
            const exists = await Product.findOne({ slug });

            if (exists) {
                console.log("Ignorando duplicado:", item.productName, " - ", item.productCatIds);
                skippedDuplicate++;
                continue;
            }

            // ✅ Salva produto
            await Product.findOneAndUpdate(
                { external_id: item.itemId.toString() },
                {
                    external_id: item.itemId.toString(),
                    title: item.productName,
                    slug,
                    store: "shopee",

                    original_url: item.productLink,
                    affiliate_url: item.offerLink,

                    price: Number(item.priceMin),
                    price_original: Number(item.priceMax),
                    discount_percent: item.priceDiscountRate,
                    commission: item.commission,

                    image_url: item.imageUrl,

                    source: "api",
                    categories: "geral",
                },
                { upsert: true, new: true }
            );

            imported++;
        }

        res.json({
            success: true,
            message: "Importação concluída",
            imported,
            skippedBlocked,
            skippedDuplicate,
            total: nodes.length
        });

    } catch (err) {
        console.error("Erro ao salvar no banco:", err);
        res.status(500).json({ error: "Erro ao salvar no banco" });
    }
});

/* ===========================
   ATUALIZAR PRODUTOS
=========================== */
router.get("/update", async (req, res) => {
    try {
        const result = await updateShopeeProducts();
        res.json(result);
    } catch (err) {
        console.error("Erro ao atualizar:", err);
        res.status(500).json({ error: "Erro ao atualizar os produtos" });
    }
});

/*Importar muitos produtos */

router.get("/import/all", async (req, res) => {
    const limit = 400; // total desejado

    let imported = 0;
    let skippedBlocked = 0;
    let skippedDuplicate = 0;

    try {
        // Busca todos os produtos respeitando o limite total
        const nodes = await fetchShopeeCustomLimit();

        for (const item of nodes) {
            const normalized = normalizeTitle(item.productName);
            const slug = slugify(normalized, { lower: true, strict: true });

            // ❌ Bloqueia palavras
            if (blockedKeywords.some(word => normalized.includes(word))) {
                console.log("Ignorando item bloqueado:", item.productName);
                skippedBlocked++;
                continue;
            }

            // 🔍 Verifica duplicado
            const exists = await Product.findOne({ slug });
            if (exists) {
                console.log("Ignorando duplicado:", item.productName);
                skippedDuplicate++;
                continue;
            }

            // ✅ Salva produto
            await Product.findOneAndUpdate(
                { external_id: item.itemId.toString() },
                {
                    external_id: item.itemId.toString(),
                    title: item.productName,
                    slug,
                    store: "shopee",

                    original_url: item.productLink,
                    affiliate_url: item.offerLink,

                    price: Number(item.priceMin),
                    price_original: Number(item.priceMax),
                    discount_percent: item.priceDiscountRate,
                    commission: item.commission,

                    image_url: item.imageUrl,

                    source: "api",
                    categories: "geral",
                },
                { upsert: true, new: true }
            );

            imported++;
        }

        res.json({
            success: true,
            message: "Importação concluída",
            imported,
            skippedBlocked,
            skippedDuplicate,
            totalFetched: nodes.length,
        });

    } catch (err) {
        console.error("Erro ao importar produtos:", err);
        res.status(500).json({ error: "Erro ao importar produtos" });
    }
});




export default router;
