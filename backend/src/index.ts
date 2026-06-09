// src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter }          from './routes/auth';
import { rolesRouter }         from './routes/roles';
import { usersRouter }         from './routes/users';
import { productsRouter }      from './routes/products';
import { modifiersRouter,
         modifierGroupsRouter } from './routes/modifiers';
import { categoriesRouter }    from './routes/categories';
import { salesRouter }         from './routes/sales';
import { cashCutsRouter }      from './routes/cashCuts';
import { inventoryRouter }     from './routes/inventory';
import { authenticate }        from './middleware/auth';

const app  = express();
const PORT = process.env.PORT ?? 4000;

// ── Middlewares globales ──────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL ?? '*' }));
app.use(express.json());

// ── Rutas públicas ────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);

// ── Rutas protegidas (requieren JWT) ─────────────────────────────────────────
app.use('/api/roles',           authenticate, rolesRouter);
app.use('/api/users',           authenticate, usersRouter);
app.use('/api/products',        authenticate, productsRouter);

// MenuConfig
app.use('/api/categories',      authenticate, categoriesRouter);

// Modificadores — rutas nuevas /api/modifier-groups Y compatibilidad /api/modifiers
app.use('/api/modifier-groups', authenticate, modifierGroupsRouter);
app.use('/api/modifiers',       authenticate, modifiersRouter);   // compatibilidad

app.use('/api/sales',           authenticate, salesRouter);
app.use('/api/cash-cuts',       authenticate, cashCutsRouter);
app.use('/api/inventory',       authenticate, inventoryRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

app.listen(PORT, () => console.log(`🚀 API escuchando en http://localhost:${PORT}`));
