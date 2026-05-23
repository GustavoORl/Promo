import express from "express";
import slugify from "slugify";
import Product from "../models/Product.js";
import { fetchShopeeOffers, fetchShopeeCustomLimit } from "../api/shopee.api.js";
import { updateShopeeProducts } from "../api/shopee.update.js";

const router = express.Router();

function normalizeTitle(title) {
    return title
        .toLowerCase()
        .replace(/^\d+x\s*/g, "")
        .replace(/promo(ção)?/g, "")
        .replace(/\bkit\b/g, "")
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

const blockedKeywords = ["tenis", "tnis", "tênis"];

async function salvarProdutos(nodes) {
    let imported = 0, skippedBlocked = 0, skippedDuplicate = 0;

    for (const item of nodes) {
        const normalized = normalizeTitle(item.productName);
        const slug = slugify(normalized, { lower: true, strict: true });

        if (blockedKeywords.some(word => normalized.includes(word))) {
            skippedBlocked++;
            continue;
        }

        const exists = await Product.findOne({ slug });
        if (exists) {
            skippedDuplicate++;
            continue;
        }

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

    return { imported, skippedBlocked, skippedDuplicate };
}

// ─────────────────────────────────────────
// IMPORTAR - busca simples (1 pagina)
// ─────────────────────────────────────────
router.get("/import", async (req, res) => {
    const { keyword = "", limit = 5, listType = 0, sortType = 1, isAMSOffer = "false" } = req.query;

    const data = await fetchShopeeOffers(keyword, Number(limit), 1, {
        listType: Number(listType),
        sortType: Number(sortType),
        isAMSOffer: isAMSOffer === "true",
    });

    if (!data || data.errors) {
        return res.status(400).json({ error: data?.errors || "Erro na API da Shopee" });
    }

    const nodes = data.data?.productOfferV2?.nodes || [];

    try {
        const result = await salvarProdutos(nodes);
        res.json({ success: true, message: "Importacao concluida", total: nodes.length, ...result });
    } catch (err) {
        console.error("Erro ao salvar:", err);
        res.status(500).json({ error: "Erro ao salvar no banco" });
    }
});

// ─────────────────────────────────────────
// IMPORTAR EM MASSA - multiplas paginas
// ─────────────────────────────────────────
router.get("/import/all", async (req, res) => {
    const { keyword = "", limit = 100, listType = 0, sortType = 1, isAMSOffer = "false" } = req.query;

    try {
        const nodes = await fetchShopeeCustomLimit(keyword, Number(limit), {
            listType: Number(listType),
            sortType: Number(sortType),
            isAMSOffer: isAMSOffer === "true",
        });

        const result = await salvarProdutos(nodes);
        res.json({ success: true, message: "Importacao concluida", totalFetched: nodes.length, ...result });
    } catch (err) {
        console.error("Erro ao importar:", err);
        res.status(500).json({ error: "Erro ao importar produtos" });
    }
});

// ─────────────────────────────────────────
// ATUALIZAR precos dos produtos existentes
// ─────────────────────────────────────────
router.get("/update", async (req, res) => {
    try {
        const result = await updateShopeeProducts();
        res.json(result);
    } catch (err) {
        console.error("Erro ao atualizar:", err);
        res.status(500).json({ error: "Erro ao atualizar os produtos" });
    }
});

export default router;
