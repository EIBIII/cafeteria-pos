import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// El usuario con roleId 'admin' es único y no se puede eliminar,
// cambiar de rol ni desactivar. Solo se pueden editar: name, email, phone, password.
const PROTECTED_ROLE = 'admin';

const CreateSchema = z.object({
  name:     z.string().min(1),
  email:    z.string().email().optional().or(z.literal('')).transform(v => v || undefined),
  phone:    z.string().optional().or(z.literal('')).transform(v => v || undefined),
  password: z.string().min(1).optional(),
  roleId:   z.string().min(1),
  active:   z.boolean().default(true),
});

const UpdateSchema = z.object({
  name:     z.string().min(1).optional(),
  email:    z.string().email().optional().or(z.literal('')).transform(v => v || undefined),
  phone:    z.string().optional().or(z.literal('')).transform(v => v || undefined),
  password: z.string().min(1).optional(),
  roleId:   z.string().min(1).optional(),
  active:   z.boolean().optional(),
});

router.get('/', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, active: true, roleId: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { name, email, phone, roleId, active, password } = parsed.data;

    // No se puede crear un segundo usuario admin
    if (roleId === PROTECTED_ROLE) {
      const existing = await prisma.user.count({ where: { roleId: PROTECTED_ROLE } });
      if (existing > 0)
        return res.status(409).json({ error: 'Ya existe un usuario Administrador. Solo puede haber uno.' });
    }

    const hash = await bcrypt.hash(password ?? '1234', 10);
    const user = await prisma.user.create({
      data:   { name, email, phone, roleId, active, password: hash },
      select: { id: true, name: true, email: true, phone: true, active: true, roleId: true },
    });
    res.status(201).json(user);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id     = Number(req.params.id);
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { name, email, phone, roleId, active, password } = parsed.data;

    // Verificar si es el usuario admin protegido
    const target = await prisma.user.findUnique({ where: { id }, select: { roleId: true } });
    const isAdminUser = target?.roleId === PROTECTED_ROLE;

    const data: any = {};

    if (isAdminUser) {
      // Admin: solo se puede editar nombre, email, teléfono y contraseña
      if (name  !== undefined) data.name  = name;
      if (email !== undefined) data.email = email;
      if (phone !== undefined) data.phone = phone;
      if (password && password.length > 0) data.password = await bcrypt.hash(password, 10);
      // roleId y active se ignoran — no se puede cambiar rol ni desactivar al admin
    } else {
      if (name     !== undefined) data.name     = name;
      if (email    !== undefined) data.email    = email;
      if (phone    !== undefined) data.phone    = phone;
      if (roleId   !== undefined) {
        // Tampoco se puede cambiar otro usuario al rol admin si ya existe uno
        if (roleId === PROTECTED_ROLE) {
          const existing = await prisma.user.count({ where: { roleId: PROTECTED_ROLE } });
          if (existing > 0)
            return res.status(409).json({ error: 'Ya existe un usuario Administrador. Solo puede haber uno.' });
        }
        data.roleId = roleId;
      }
      if (active   !== undefined) data.active   = active;
      if (password && password.length > 0) data.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(data).length === 0)
      return res.status(400).json({ error: 'No hay campos para actualizar.' });

    const user = await prisma.user.update({
      where:  { id },
      data,
      select: { id: true, name: true, email: true, phone: true, active: true, roleId: true },
    });
    res.json(user);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const id     = Number(req.params.id);
    const target = await prisma.user.findUnique({ where: { id }, select: { roleId: true } });

    if (target?.roleId === PROTECTED_ROLE)
      return res.status(403).json({ error: 'El usuario Administrador es protegido y no puede eliminarse.' });

    await prisma.user.delete({ where: { id } });
    res.json({ deleted: id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export { router as usersRouter };
