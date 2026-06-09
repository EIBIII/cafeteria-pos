import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { sendTicketEmail } from '../services/emailService';

const router = Router();
const prisma  = new PrismaClient();

const SaleItemSchema = z.object({
  productId:         z.number().int(),
  quantity:          z.number().int().min(1),
  unitPrice:         z.number(),
  subtotal:          z.number(),
  modifierOptionIds: z.array(z.number().int()).default([]),
});

const CreateSaleSchema = z.object({
  items:         z.array(SaleItemSchema).min(1),
  subtotal:      z.number(),
  tax:           z.number(),
  total:         z.number(),
  customerName:  z.string().optional(),
  customerEmail: z.string().email().optional(),
});

router.get('/', async (_req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { date: 'desc' },
      take: 500,
      include: {
        user:  { select: { name: true } },
        items: {
          include: {
            product:   { select: { id: true, name: true, image: true, categoryId: true } },
            modifiers: { include: { modifierOption: { select: { name: true } } } },
          },
        },
      },
    });
    res.json(sales);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const parsed = CreateSaleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = req.user!.userId;
  const { items, subtotal, tax, total, customerName, customerEmail } = parsed.data;

  try {
    const sale = await prisma.$transaction(async tx => {
      const newSale = await tx.sale.create({
        data: {
          subtotal, tax, total, customerName, customerEmail, userId,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              quantity:  item.quantity,
              unitPrice: item.unitPrice,
              subtotal:  item.subtotal,
              modifiers: item.modifierOptionIds.length > 0 ? {
                create: item.modifierOptionIds.map(optId => ({ modifierOptionId: optId })),
              } : undefined,
            })),
          },
        },
        include: {
          user:  { select: { name: true } },
          items: {
            include: {
              product:   { select: { id: true, name: true, image: true, categoryId: true } },
              modifiers: { include: { modifierOption: { select: { name: true } } } },
            },
          },
        },
      });

      // Descontar inventario (ignorar errores de stock insuficiente para no bloquear ventas)
      for (const item of newSale.items) {
        try {
          const recipe = await tx.recipeIngredient.findMany({ where: { productId: item.productId } });
          for (const ing of recipe) {
            await tx.inventoryItem.updateMany({
              where: { id: ing.inventoryItemId, quantity: { gte: ing.quantity * item.quantity } },
              data:  { quantity: { decrement: ing.quantity * item.quantity } },
            });
          }
        } catch { /* continuar aunque falle el inventario */ }
      }

      return newSale;
    });

    // Enviar ticket por correo (async, no bloquea)
    if (customerEmail) {
      sendTicketEmail(customerEmail, {
        orderNumber:  sale.orderNumber,
        date:         sale.date,
        customerName: sale.customerName ?? undefined,
        sellerName:   sale.user.name,
        items: sale.items.map(it => ({
          productName: it.product.name,
          quantity:    it.quantity,
          unitPrice:   it.unitPrice,
          subtotal:    it.subtotal,
          modifiers:   it.modifiers.map(m => m.modifierOption.name),
        })),
        subtotal: sale.subtotal,
        tax:      sale.tax,
        total:    sale.total,
      }).catch(console.error);
    }

    return res.status(201).json(sale);
  } catch (e: any) {
    console.error('[sales] Error:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

export { router as salesRouter };
