import { Router } from "express"
import { 
    showCategory,
    createCategory
 } from "../controllers/category.controller.js";

const router = Router();

router.post("/", createCategory)
router.get("/", showCategory);

export default router;
