// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId:         number;
  roleId:         string;
  allowedViews:   string[];
  requiresCashCut: boolean;
}

// Extiende el tipo Request de Express para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Middleware para requerir un rol específico (por vista)
export function requireView(viewId: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.allowedViews.includes(viewId)) {
      return res.status(403).json({ error: `Sin acceso a la vista "${viewId}"` });
    }
    next();
  };
}
