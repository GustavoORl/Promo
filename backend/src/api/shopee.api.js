import crypto from "crypto";
import axios from "axios";

const APP_ID = "18332630877";
const SECRET = "PPK3E2AZ7CHAUANQX2E74KLJOLLRS2BY";
const ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";

function generateAuthHeader(payload) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signatureBase = APP_ID + timestamp + payload + SECRET;
  const signature = crypto
    .createHash("sha256")
    .update(signatureBase)
    .digest("hex");

  return `SHA256 Credential=${APP_ID}, Timestamp=${timestamp}, Signature=${signature}`;
}

// Busca uma página de produtos
// page: número da página (começa em 1)
// limit: quantidade por página (máx 50)
export async function fetchShopeeOffers(keyword, limit = 5, page = 1) {
  const payloadObj = {
    query: `
      {
        productOfferV2(
          keyword: "${keyword}",
          page: ${page},
          limit: ${limit},
          isAMSOffer: true,
          listType: 2,
          sortType: 2
        ) {
          nodes {
            itemId
            productName
            imageUrl
            productLink
            offerLink
            priceMin
            priceMax
            priceDiscountRate
            commission
          }
          pageInfo {
            page
            limit
            hasNextPage
          }
        }
      }
    `
  };

  const payload = JSON.stringify(payloadObj);
  const auth = generateAuthHeader(payload);

  try {
    const response = await axios.post(
      ENDPOINT,
      payloadObj,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
        },
      }
    );

    return response.data;
  } catch (err) {
    console.error("❌ Erro ao consultar API da Shopee:", err.response?.data || err);
    return null;
  }
}

// Busca múltiplas páginas até atingir o totalLimit desejado
export async function fetchShopeeCustomLimit(keyword = "lovita", totalLimit = 200) {
  const allNodes = [];
  const pageLimit = 50; // cada página retorna no máximo 50 itens

  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && allNodes.length < totalLimit) {
    const remaining = totalLimit - allNodes.length;
    const currentLimit = Math.min(remaining, pageLimit);

    console.log(`📄 Buscando página ${page}, limit ${currentLimit}...`);

    const data = await fetchShopeeOffers(keyword, currentLimit, page);

    if (!data || data.errors) {
      console.error("❌ Erro ao buscar página:", page, data?.errors);
      break;
    }

    const pageInfo = data.data?.productOfferV2?.pageInfo;
    const nodes = data.data?.productOfferV2?.nodes;

    if (!nodes || nodes.length === 0) {
      console.log("⚠️ Nenhum resultado na página", page);
      break;
    }

    allNodes.push(...nodes);
    hasNextPage = pageInfo?.hasNextPage ?? false;
    page++;
  }

  console.log(`✅ Total de produtos buscados: ${allNodes.length}`);
  return allNodes.slice(0, totalLimit);
}
