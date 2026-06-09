// src/routes/categories.ts
// CRUD completo para Categorías de productos
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const CategorySchema = z.object({
  id:       z.string().min(1).optional(),   // slug generado si no viene
  name:     z.string().min(1),
  icon:     z.string().default('☕'),
  position: z.number().int().default(0),
});

// ── GET /api/categories ───────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const cats = await prisma.category.findMany({ orderBy: { position: 'asc' } });
    res.json(cats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/categories ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const parsed = CategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { id: rawId, name, icon, position } = parsed.data;
    // Si no viene id, generarlo desde el nombre
    const id = rawId ?? name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    const cat = await prisma.category.upsert({
      where:  { id },
      update: { name, icon, position },
      create: { id, name, icon, position },
    });
    res.status(201).json(cat);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /api/categories/:id ───────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const id     = req.params.id;
    const parsed = CategorySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { name, icon, position } = parsed.data;
    const cat = await prisma.category.update({
      where: { id },
      data: {
        ...(name     !== undefined && { name }),
        ...(icon     !== undefined && { icon }),
        ...(position !== undefined && { position }),
      },
    });
    res.json(cat);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/categories/:id ────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    // Verificar que no tenga productos asociados activos
    const productCount = await prisma.product.count({ where: { categoryId: id, active: true } });
    if (productCount > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: hay ${productCount} producto(s) activo(s) en esta categoría.`,
      });
    }
    await prisma.category.delete({ where: { id } });
    res.json({ deleted: id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export { router as categoriesRouter };
