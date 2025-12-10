import { baixarFeedAwin } from "../api/awin.api.js";
import express from "express"

const router = express.Router();


router.get("/", async (req, res) => {
    await baixarFeedAwin();

    res.json({status: "Feed baixado com sucesso!"});
});

export default router;