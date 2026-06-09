import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router  = Router();
const prisma  = new PrismaClient();

const RecipeSchema = z.array(z.object({
  inventoryItemId: z.number().int(),
  quantity:        z.number().positive(),
})).optional().default([]);

const ProductSchema = z.object({
  name:       z.string().min(1),
  price:      z.number().positive(),
  image:      z.string().default('☕'),
  categoryId: z.string(),
  active:     z.boolean().default(true),
  recipe:     RecipeSchema,
});

// ── GET /api/products ─────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      where:   { active: true },
      include: {
        category: true,
        recipe:   { include: { inventoryItem: { select: { id: true, name: true, unit: true } } } },
        modifierGroups: {
          include: { modifierGroup: { include: { options: { orderBy: { position: 'asc' } } } } },
          orderBy: { modifierGroup: { position: 'asc' } },
        },
      },
    });
    res.json(products);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/products ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const parsed = ProductSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { name, price, image, categoryId, recipe } = parsed.data;

    // Crear o reutilizar categoría si no existe en la BD
    await prisma.category.upsert({
      where:  { id: categoryId },
      update: {},
      create: { id: categoryId, name: categoryId, icon: '📂', position: 99 },
    });

    const product = await prisma.$transaction(async tx => {
      const p = await tx.product.create({ data: { name, price, image, categoryId } });
      if (recipe && recipe.length > 0) {
        await tx.recipeIngredient.createMany({
          data: recipe
            .filter(r => r.inventoryItemId > 0 && r.quantity > 0)
            .map(r => ({ productId: p.id, inventoryItemId: r.inventoryItemId, quantity: r.quantity })),
        });
      }
      return tx.product.findUnique({
        where:   { id: p.id },
        include: { recipe: true, category: true },
      });
    });

    res.status(201).json(product);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/products/:id ─────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const id     = Number(req.params.id);
    const parsed = ProductSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { name, price, image, categoryId, active, recipe } = parsed.data;

    // Crear categoría si no existe
    if (categoryId) {
      await prisma.category.upsert({
        where:  { id: categoryId },
        update: {},
        create: { id: categoryId, name: categoryId, icon: '📂', position: 99 },
      });
    }

    const product = await prisma.$transaction(async tx => {
      const p = await tx.product.update({
        where: { id },
        data: {
          ...(name       !== undefined && { name }),
          ...(price      !== undefined && { price }),
          ...(image      !== undefined && { image }),
          ...(categoryId !== undefined && { categoryId }),
          ...(active     !== undefined && { active }),
        },
      });

      // Si viene receta, reemplazar completa
      if (recipe !== undefined) {
        await tx.recipeIngredient.deleteMany({ where: { productId: id } });
        if (recipe.length > 0) {
          await tx.recipeIngredient.createMany({
            data: recipe
              .filter(r => r.inventoryItemId > 0 && r.quantity > 0)
              .map(r => ({ productId: id, inventoryItemId: r.inventoryItemId, quantity: r.quantity })),
          });
        }
      }
      return tx.product.findUnique({ where: { id }, include: { recipe: true, category: true } });
    });

    res.json(product);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/products/:id (soft delete) ────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await prisma.product.update({ where: { id: Number(req.params.id) }, data: { active: false } });
    res.json({ deleted: Number(req.params.id) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


// ── GET /api/categories ───────────────────────────────────────────────────────
// Ruta separada que el frontend puede usar para listar las categorías disponibles
router.get('/categories', async (_req, res) => {
  try {
    const cats = await prisma.category.findMany({ orderBy: { position: 'asc' } });
    res.json(cats);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export { router as productsRouter };

// Ruta extra: listar todas las categorías (para el selector de ProductManagement)
// GET /api/products/categories
