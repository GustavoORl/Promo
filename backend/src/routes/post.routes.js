import { Router } from "express";
import { 
    newPost, 
    showPosts,
    
 } from "../controllers/post.controller.js";

 const router = Router();

 router.post("/", newPost);
 router.get("/", showPosts);

 export default router;