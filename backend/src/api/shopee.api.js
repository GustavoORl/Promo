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

/*
  listType:
    0 = Todos os produtos
    1 = Ofertas relampago (Flash Sale)
    2 = Produtos com desconto
    4 = Top vendidos / Tendencias

  sortType:
    1 = Relevância
    2 = Maior desconto
    3 = Mais vendidos
    4 = Maior comissão
    5 = Preço: menor para maior
    6 = Preço: maior para menor
    7 = Mais recentes

  isAMSOffer:
    true  = Apenas produtos patrocinados (AMS)
    false = Todos os produtos
*/
export async function fetchShopeeOffers(keyword = "", limit = 5, page = 1, options = {}) {
  const {
    listType = 0,
    sortType = 1,
    isAMSOffer = false,
  } = options;

  const keywordParam = keyword ? `keyword: "${keyword}",` : "";

  const payloadObj = {
    query: `
      {
        productOfferV2(
          ${keywordParam}
          page: ${page},
          limit: ${limit},
          isAMSOffer: ${isAMSOffer},
          listType: ${listType},
          sortType: ${sortType}
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
    const response = await axios.post(ENDPOINT, payloadObj, {
      headers: { "Content-Type": "application/json", Authorization: auth },
    });
    return response.data;
  } catch (err) {
    console.error("Erro ao consultar API da Shopee:", err.response?.data || err.message);
    return null;
  }
}

export async function fetchShopeeCustomLimit(keyword = "", totalLimit = 100, options = {}) {
  const allNodes = [];
  const pageLimit = 50;
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && allNodes.length < totalLimit) {
    const remaining = totalLimit - allNodes.length;
    const currentLimit = Math.min(remaining, pageLimit);

    console.log(`Buscando pagina ${page}, limit ${currentLimit} (listType=${options.listType ?? 0}, sortType=${options.sortType ?? 1})...`);

    const data = await fetchShopeeOffers(keyword, currentLimit, page, options);

    if (!data || data.errors) {
      console.error("Erro ao buscar pagina:", page, data?.errors);
      break;
    }

    const pageInfo = data.data?.productOfferV2?.pageInfo;
    const nodes = data.data?.productOfferV2?.nodes;

    if (!nodes || nodes.length === 0) {
      console.log("Nenhum resultado na pagina", page);
      break;
    }

    allNodes.push(...nodes);
    hasNextPage = pageInfo?.hasNextPage ?? false;
    page++;
  }

  console.log(`Total de produtos buscados: ${allNodes.length}`);
  return allNodes.slice(0, totalLimit);
}
