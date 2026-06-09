import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma  = new PrismaClient();

const CreateCutSchema = z.object({
  loginTime:    z.string().datetime(),
  salesCount:   z.number().int().min(0),
  totalSales:   z.number(),
  expectedCash: z.number(),
  actualCash:   z.number(),
  notes:        z.string().optional(),
});

router.get('/', async (_req, res) => {
  try {
    const cuts = await prisma.cashCut.findMany({
      orderBy: { date: 'desc' },
      include: { user: { select: { name: true, roleId: true } } },
    });
    res.json(cuts);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    // Solo roles con requiresCashCut pueden registrar corte
    if (!req.user!.requiresCashCut) {
      return res.status(403).json({ error: 'Tu rol no requiere corte de caja.' });
    }
    const parsed = CreateCutSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { loginTime, salesCount, totalSales, expectedCash, actualCash, notes } = parsed.data;
    const cut = await prisma.cashCut.create({
      data: {
        loginTime:    new Date(loginTime),
        salesCount, totalSales, expectedCash, actualCash,
        difference:   actualCash - expectedCash,
        notes:        notes ?? '',
        userId:       req.user!.userId,
      },
    });
    res.status(201).json(cut);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export { router as cashCutsRouter };
