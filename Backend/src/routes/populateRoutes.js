// routes/populateRouter.js
import express from "express";
import { authMiddleware } from "../Controller/AuthController.js";
import { populateHelper } from "../helper/populateHelper.js";
import { upload } from "../middlewares/multerConfig.js";
import { queueMiddleware } from "../services/requestQueue.js";

const router = express.Router();

// Queue middleware: enabled on all populate routes.
// Reads are skipped (already protected by query cache); mutations are serialized per device.
// Public endpoints that must never be queued:
//   - create/candidates: unauthenticated career form submission (stateless write)
//   - read/jobopenings:  public job listing (read, already excluded below)
// The in-memory queue is incompatible with Vercel serverless — the _serverProcessing
// counter leaks when a function invocation times out or errors before res.json() fires.
const PUBLIC_NO_QUEUE_ROUTES = new Set(['create/candidates', 'read/jobopenings']);

const populate_queue = queueMiddleware({
  enabled: true,
  shouldQueue: (req) => {
    // Never queue public career endpoints (guest-bypass routes)
    const routeKey = `${req.params?.action}/${req.params?.model}`;
    if (PUBLIC_NO_QUEUE_ROUTES.has(routeKey)) return false;

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
