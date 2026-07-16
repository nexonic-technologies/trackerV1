// routes/populateRouter.js
import express from "express";
import { authMiddleware } from "../Controller/AuthController.js";
import { populateHelper } from "../helper/populateHelper.js";
import { upload } from "../middlewares/multerConfig.js";
import { queueMiddleware } from "../services/requestQueue.js";

const router = express.Router();

// Queue middleware: enabled on all populate routes.
// Reads are skipped (already protected by query cache); mutations are serialized per device.
const populate_queue = queueMiddleware({
  enabled: true,
  shouldQueue: (req) => {
    // Only queue mutating actions — reads are stateless and cached
    const action = req.params?.action;
    return !['read', 'list', 'statistics'].includes(action);
  }
});

// without id
router.all("/:action/:model", authMiddleware, populate_queue, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'attachments', maxCount: 10 }]), populateHelper);

// with id  
router.all("/:action/:model/:id", authMiddleware, populate_queue, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'attachments', maxCount: 10 }]), populateHelper);

export default router;
