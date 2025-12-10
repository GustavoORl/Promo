import { Router } from "express";
import { 
    newProduct, 
    showProduct, 
    showProducts, 
    updateProduct, 
    deleteProduct 
} from "../controllers/product.controller.js";

const router =  Router();

router.post("/", newProduct);
router.get("/", showProducts);
router.get("/:id", showProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;