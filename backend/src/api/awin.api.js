import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function baixarFeedAwin() {
  try {
    const publisherId = "2687876";
    const token = "50ea1a61-c2c2-4b5a-9a12-61f815061e98";

    const url = `https://productdata.awin.com/datafeed/download?publisherId=${publisherId}&token=${token}&format=csv&compression=gzip`;

    const output = path.resolve(__dirname, "awin_feed.gz");

    const response = await axios({
      url,
      method: "GET",
      responseType: "stream"
    });

    const writer = fs.createWriteStream(output);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log("Feed da Awin baixado com sucesso!");
        resolve(output);
      });

      writer.on("error", reject);
    });

  } catch (error) {
    console.error("Erro ao baixar feed:", error.response?.status, error.response?.data);
  }
}
