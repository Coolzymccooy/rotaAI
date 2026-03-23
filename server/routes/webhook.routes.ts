/**
 * Outbound Webhooks (#10)
 *
 * Fires HTTP callbacks to external systems when events happen in RotaAI.
 * Trusts can register webhook URLs to integrate with HR/payroll.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { logger } from '../config/logger.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));

// In-memory webhook store (in production, use a DB model)
let webhooks: Map<string, { url: string; events: string[]; secret: string; active: boolean }> = new Map();

// POST /api/webhooks — register a webhook
router.post('/', (req: Request, res: Response) => {
  const { url, events, secret } = req.body;
  const id = crypto.randomUUID();
  webhooks.set(id, { url, events: events || ['*'], secret: secret || '', active: true });
  res.status(201).json({ success: true, data: { id, url, events } });
});

// GET /api/webhooks — list registered webhooks
router.get('/', (_req: Request, res: Response) => {
  const list = Array.from(webhooks.entries()).map(([id, wh]) => ({ id, ...wh }));
  res.json({ success: true, data: list });
});

// DELETE /api/webhooks/:id
router.delete('/:id', (req: Request, res: Response) => {
  webhooks.delete(req.params.id);
  res.json({ success: true, message: 'Webhook deleted' });
});

export default router;

// Fire webhook to all registered listeners
export async function fireWebhook(event: string, payload: any) {
  for (const [id, wh] of webhooks.entries()) {
    if (!wh.active) continue;
    if (!wh.events.includes('*') && !wh.events.includes(event)) continue;

    try {
      const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (wh.secret) {
        const crypto = await import('crypto');
        headers['X-Webhook-Signature'] = crypto.createHmac('sha256', wh.secret).update(body).digest('hex');
      }

      fetch(wh.url, { method: 'POST', headers, body }).catch(() => {
        logger.warn(`Webhook ${id} failed: ${wh.url}`);
      });
    } catch {}
  }
}
