// src/routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const user = await prisma.user.findUnique({
      where:   { email },
      include: { role: true },
    });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // ── El payload del JWT incluye toda la info de permisos ──
    // El frontend puede leer esto sin llamar al servidor en cada navegación.
    const payload = {
      userId:          user.id,
      roleId:          user.roleId,
      allowedViews:    user.role.allowedViews,
      requiresCashCut: user.role.requiresCashCut,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '12h' });

    return res.json({
      token,
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  {
          id:              user.role.id,
          label:           user.role.label,
          color:           user.role.color,
          allowedViews:    user.role.allowedViews,
          requiresCashCut: user.role.requiresCashCut,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/logout
// El cierre de sesión en JWT es stateless (el cliente descarta el token).
// Este endpoint solo registra el evento y NO exige corte — esa validación
// es exclusiva del FRONTEND según el rol.
router.post('/logout', async (req, res) => {
  // Podrías guardar el token en una blacklist en Redis si necesitas invalidación real.
  return res.json({ message: 'Sesión cerrada' });
});

export { router as authRouter };
