import { Router } from "express";
import { 
    newProduct, 
    showProduct, 
    showProducts, 
    updateProduct, 
    deleteProduct,
    deleteMulti
} from "../controllers/product.controller.js";

const router =  Router();

router.post("/", newProduct);
router.get("/", showProducts);
router.get("/:id", showProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.post("/delete-multiple", deleteMulti);
    

export default router;