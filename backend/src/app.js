import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import axios from "axios"
import "./crons/botCron.js";

import productsRoutes from "./routes/product.routes.js"
import postsRoutes from "./routes/post.routes.js"
import botRoutes from "./routes/bot.route.js"
import awinRoutes from "./routes/awin.route.js"
import shopeeRoutes from "./routes/shopee.route.js"

const PORT = 3000;
const app = express();
app.use(cors());
app.use(express.json());


mongoose.connect("mongodb+srv://gustavoOrl:Atumcaiu12@promo.q9dleu7.mongodb.net/?appName=Promo");

let db = mongoose.connection;

db.on("error", () => {console.log("Houve um erro")});
db.once("open", () => {console.log("db carregado")});

app.use("/api/produtos", productsRoutes);
app.use("/api/postagens", postsRoutes);
app.use("/api/bot", botRoutes);
app.use("/api/awin/importar", awinRoutes);
app.use("/api/shopee", shopeeRoutes);

app.listen(PORT, ()=>{
    console.log(`Server rodando na Porta ${PORT}`);
})
