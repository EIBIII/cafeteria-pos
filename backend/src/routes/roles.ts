import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma  = new PrismaClient();

// El rol admin es inmutable en id, label, allowedViews.
// Solo se puede modificar color y requiresCashCut.
const PROTECTED_ROLE = 'admin';

const RoleSchema = z.object({
  id:              z.string().min(1).regex(/^[a-z0-9_]+$/).optional(),
  label:           z.string().min(1),
  color:           z.string().default('blue'),
  allowedViews:    z.array(z.string()),
  requiresCashCut: z.boolean().default(false),
});

router.get('/', async (_req, res) => {
  try { res.json(await prisma.role.findMany()); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const parsed = RoleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { label, color, allowedViews, requiresCashCut } = parsed.data;
    const id = parsed.data.id ?? label.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');

    // No se puede crear un rol con id "admin" (ya existe y es único)
    if (id === PROTECTED_ROLE)
      return res.status(409).json({ error: 'El rol "admin" es único y ya existe.' });

    const role = await prisma.role.create({ data: { id, label, color, allowedViews, requiresCashCut } });
    res.status(201).json(role);
  } catch (e: any) { res.status(e.code === 'P2002' ? 409 : 500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const roleId = req.params.id;
    const parsed = RoleSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { label, color, allowedViews, requiresCashCut } = parsed.data;
    const data: any = {};

    if (roleId === PROTECTED_ROLE) {
      // Para admin: solo se permite cambiar color y requiresCashCut
      if (color           !== undefined) data.color           = color;
      if (requiresCashCut !== undefined) data.requiresCashCut = requiresCashCut;
      // label y allowedViews se ignoran silenciosamente
    } else {
      if (label           !== undefined) data.label           = label;
      if (color           !== undefined) data.color           = color;
      if (allowedViews    !== undefined) data.allowedViews    = allowedViews;
      if (requiresCashCut !== undefined) data.requiresCashCut = requiresCashCut;
    }

    if (Object.keys(data).length === 0)
      return res.status(400).json({ error: 'No hay campos permitidos para actualizar.' });

    const role = await prisma.role.update({ where: { id: roleId }, data });
    res.json(role);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const roleId = req.params.id;

    // El rol admin nunca se puede eliminar
    if (roleId === PROTECTED_ROLE)
      return res.status(403).json({ error: 'El rol "Administrador" es protegido y no puede eliminarse.' });

    const count = await prisma.user.count({ where: { roleId } });
    if (count > 0) return res.status(409).json({ error: `Hay ${count} usuario(s) con este rol.` });

    await prisma.role.delete({ where: { id: roleId } });
    res.json({ deleted: roleId });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export { router as rolesRouter };
