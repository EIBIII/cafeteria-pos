import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
 
const router = Router();
const prisma = new PrismaClient();
 
// id nunca se acepta en create/update — solo name, quantity, unit, minStock
const ItemSchema = z.object({
  name:     z.string().min(1),
  quantity: z.number().min(0),
  unit:     z.string().min(1),
  minStock: z.number().min(0).default(0),
});
 
router.get('/', async (_req, res) => {
  try {
    res.json(await prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } }));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
 
router.post('/', async (req, res) => {
  try {
    const parsed = ItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    // Destruir cualquier id que venga del cliente — Prisma usa autoincrement
    const { name, quantity, unit, minStock } = parsed.data;
    const item = await prisma.inventoryItem.create({ data: { name, quantity, unit, minStock } });
    res.status(201).json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
 
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = ItemSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { name, quantity, unit, minStock } = parsed.data;
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: { ...(name !== undefined && { name }), ...(quantity !== undefined && { quantity }), ...(unit !== undefined && { unit }), ...(minStock !== undefined && { minStock }), lastRestocked: new Date() },
    });
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
 
router.delete('/:id', async (req, res) => {
  try {
    await prisma.inventoryItem.delete({ where: { id: Number(req.params.id) } });
    res.json({ deleted: Number(req.params.id) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
 
export { router as inventoryRouter };