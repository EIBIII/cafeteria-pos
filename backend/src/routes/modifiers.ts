// src/routes/modifiers.ts
// Maneja los "Grupos de Modificadores" dinámicos: Tamaño, Leche, Endulzante, etc.
// Actualizado: incluye color, appliesTo, kind. Soporta upsert de opciones completo.
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// ── Schemas de validación ─────────────────────────────────────────────────────
const OptionSchema = z.object({
  id:              z.union([z.string(), z.number()]).optional(),
  name:            z.string().min(1),
  extraPrice:      z.number().default(0),
  position:        z.number().int().default(0),
  inventoryItemId: z.number().int().optional().nullable(),
});

const GroupSchema = z.object({
  name:      z.string().min(1),
  inputType: z.enum(['single', 'multi']).default('single'),
  required:  z.boolean().default(false),
  position:  z.number().int().default(0),
  color:     z.string().default('amber'),
  appliesTo: z.array(z.string()).default([]),
  kind:      z.string().default('custom'),
  // Opciones inlined: se crean/actualizan junto con el grupo
  options:   z.array(OptionSchema).optional(),
});

// ── GET /api/modifier-groups  — todos los grupos con sus opciones ─────────────
router.get('/', async (_req, res) => {
  try {
    const groups = await prisma.modifierGroup.findMany({
      orderBy: { position: 'asc' },
      include: {
        options: { orderBy: { position: 'asc' } },
      },
    });
    res.json(groups);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/modifier-groups  — crear grupo con opciones ────────────────────
router.post('/', async (req, res) => {
  try {
    const parsed = GroupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { options, ...groupData } = parsed.data;

    const group = await prisma.modifierGroup.create({
      data: {
        ...groupData,
        options: options && options.length > 0 ? {
          create: options
            .filter(o => o.name.trim())
            .map((o, idx) => ({
              name:            o.name,
              extraPrice:      o.extraPrice,
              position:        o.position ?? idx,
              inventoryItemId: o.inventoryItemId ?? null,
            })),
        } : undefined,
      },
      include: { options: { orderBy: { position: 'asc' } } },
    });
    res.status(201).json(group);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /api/modifier-groups/:id  — editar grupo y reemplazar opciones ────────
router.put('/:id', async (req, res) => {
  try {
    const id     = Number(req.params.id);
    const parsed = GroupSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { options, ...groupData } = parsed.data;

    const group = await prisma.$transaction(async tx => {
      // Actualizar datos del grupo
      await tx.modifierGroup.update({ where: { id }, data: groupData });

      // Si vienen opciones, reemplazar todas (más simple y confiable)
      if (options !== undefined) {
        // Eliminar opciones existentes que ya no estén en la lista
        const incomingIds = options
          .filter(o => o.id !== undefined)
          .map(o => Number(o.id))
          .filter(n => !isNaN(n));

        await tx.modifierOption.deleteMany({
          where: {
            groupId: id,
            ...(incomingIds.length > 0 ? { id: { notIn: incomingIds } } : {}),
          },
        });

        // Upsert cada opción
        for (let idx = 0; idx < options.length; idx++) {
          const o = options[idx];
          if (!o.name.trim()) continue;

          const numId = o.id !== undefined ? Number(o.id) : NaN;
          const isExisting = !isNaN(numId) && numId > 0;

          if (isExisting) {
            await tx.modifierOption.update({
              where: { id: numId },
              data: {
                name:            o.name,
                extraPrice:      o.extraPrice,
                position:        o.position ?? idx,
                inventoryItemId: o.inventoryItemId ?? null,
              },
            });
          } else {
            await tx.modifierOption.create({
              data: {
                name:            o.name,
                extraPrice:      o.extraPrice,
                position:        o.position ?? idx,
                inventoryItemId: o.inventoryItemId ?? null,
                groupId:         id,
              },
            });
          }
        }
      }

      return tx.modifierGroup.findUnique({
        where:   { id },
        include: { options: { orderBy: { position: 'asc' } } },
      });
    });

    res.json(group);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/modifier-groups/:id  — eliminar grupo (cascadea a opciones) ───
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.modifierGroup.delete({ where: { id } });
    res.json({ deleted: id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// OPCIONES dentro de un grupo (endpoints individuales, para compatibilidad)
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/modifier-groups/:groupId/options ────────────────────────────────
router.post('/:groupId/options', async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const parsed  = OptionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { id: _id, ...optData } = parsed.data;
    const option = await prisma.modifierOption.create({
      data: { ...optData, groupId },
    });
    res.status(201).json(option);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /api/modifier-groups/:groupId/options/:optId ─────────────────────────
router.put('/:groupId/options/:optId', async (req, res) => {
  try {
    const id     = Number(req.params.optId);
    const parsed = OptionSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { id: _id, ...optData } = parsed.data;
    const option = await prisma.modifierOption.update({ where: { id }, data: optData });
    res.json(option);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/modifier-groups/:groupId/options/:optId ──────────────────────
router.delete('/:groupId/options/:optId', async (req, res) => {
  try {
    const id = Number(req.params.optId);
    await prisma.modifierOption.delete({ where: { id } });
    res.json({ deleted: id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Asignar / quitar grupos a un producto
// ─────────────────────────────────────────────────────────────────────────────

// ── PUT /api/modifier-groups/assign/:productId ────────────────────────────────
router.put('/assign/:productId', async (req, res) => {
  try {
    const productId    = Number(req.params.productId);
    const { groupIds } = req.body as { groupIds: number[] };

    await prisma.productModifierGroup.deleteMany({ where: { productId } });

    if (groupIds?.length) {
      await prisma.productModifierGroup.createMany({
        data: groupIds.map(modifierGroupId => ({ productId, modifierGroupId })),
      });
    }

    const product = await prisma.product.findUnique({
      where:   { id: productId },
      include: { modifierGroups: { include: { modifierGroup: { include: { options: true } } } } },
    });
    res.json(product);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Mantener compatibilidad: /api/modifiers → mismas rutas ───────────────────
// (El frontend todavía puede usar /api/modifiers con la ruta vieja)
export { router as modifiersRouter };
export { router as modifierGroupsRouter };
