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
export async function fetchShopeeOffers(keyword, limit, page=1) {
  const payloadObj = {
    query: `
      {
        productOfferV2(
          keyword: "${keyword}",
          page: ${page},
          limit: ${limit},
          isAMSOffer: true,
          sortType: 2,
          listType: 2
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

export async function fetchShopeeCustomLimit(keyword = "ofertas", totalLimit = 200) {
  const allNodes = [];
  const pageLimit = 50; // cada página retorna no máximo 50 itens
  const totalPages = Math.ceil(totalLimit / pageLimit);

  for (let page = 1; page <= totalPages; page++) {
    // Ajusta o limit da última página se precisar
    const currentLimit = page === totalPages ? totalLimit - allNodes.length : pageLimit;

    const data = await fetchShopeeOffers(keyword, page, currentLimit);
    if (!data || data.errors) {
      console.error("Erro ao buscar página:", page);
      break;
    }

    const nodes = data.data.productOfferV2.nodes;
    allNodes.push(...nodes);

    // Se já atingiu ou ultrapassou o limite, para
    if (allNodes.length >= totalLimit) break;
  }

  return allNodes.slice(0, totalLimit); // garante que não ultrapasse o limite
}
