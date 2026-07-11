// routes/populateRouter.js
import express from "express";
import { authMiddleware } from "../Controller/AuthController.js";
import { populateHelper } from "../helper/populateHelper.js";
import { upload } from "../middlewares/multerConfig.js";

const router = express.Router();

// without id
router.all("/:action/:model", authMiddleware, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'attachments', maxCount: 10 }]), populateHelper);

// with id  
router.all("/:action/:model/:id", authMiddleware, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'attachments', maxCount: 10 }]), populateHelper);

export default router;
