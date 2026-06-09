import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetSequence(table: string, column: string = 'id') {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${table}"', '${column}'), COALESCE((SELECT MAX("${column}") FROM "${table}"), 0) + 1, false)`
  );
}

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── Roles ──────────────────────────────────────────────────────────────────
  const roles = [
    { id: 'admin',   label: 'Administrador', color: 'amber',
      allowedViews: ['pos','orders','products','inventory','menu-config','users','dashboard','account'],
      requiresCashCut: false },
    { id: 'cashier', label: 'Cajero',        color: 'emerald',
      allowedViews: ['pos','orders','account'], requiresCashCut: true },
    { id: 'waiter',  label: 'Mesero',        color: 'blue',
      allowedViews: ['pos','orders','account'], requiresCashCut: false },
  ];
  for (const r of roles)
    await prisma.role.upsert({ where: { id: r.id }, update: r, create: r });
  console.log(`✅ ${roles.length} roles`);

  // ── Usuarios ───────────────────────────────────────────────────────────────
  const usersData = [
    { name: 'Abraham Martínez', email: 'abraham@tecnm.mx', password: 'admin123', roleId: 'admin'   },
    { name: 'Mario Navarro',    email: 'mario@tecnm.mx',   password: '1234',     roleId: 'cashier' },
    { name: 'Diego Martínez',   email: 'diego@tecnm.mx',   password: '1234',     roleId: 'cashier' },
    { name: 'Ana García',       email: 'ana@tecnm.mx',     password: '1234',     roleId: 'waiter'  },
    { name: 'Luis Torres',      email: 'luis@tecnm.mx',    password: '1234',     roleId: 'cashier' },
  ];
  for (const u of usersData) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where:  { email: u.email },
      update: { name: u.name, roleId: u.roleId, password: hash, active: true },
      create: { name: u.name, email: u.email, roleId: u.roleId, password: hash, active: true },
    });
  }
  await resetSequence('User');
  console.log(`✅ ${usersData.length} usuarios`);

  // ── Categorías ─────────────────────────────────────────────────────────────
  const categories = [
    { id: 'hot',  name: 'Bebidas Calientes', icon: '☕', position: 0 },
    { id: 'cold', name: 'Bebidas Frías',     icon: '🥤', position: 1 },
    { id: 'food', name: 'Alimentos',         icon: '🥐', position: 2 },
  ];
  for (const c of categories)
    await prisma.category.upsert({ where: { id: c.id }, update: c, create: c });
  console.log(`✅ ${categories.length} categorías`);

  // ── Inventario ─────────────────────────────────────────────────────────────
  const inventoryItems = [
    { name: 'Café molido',        quantity: 1000,  unit: 'g',  minStock: 200  },
    { name: 'Leche entera',       quantity: 5000,  unit: 'ml', minStock: 1000 },
    { name: 'Leche deslactosada', quantity: 3000,  unit: 'ml', minStock: 500  },
    { name: 'Leche de almendras', quantity: 2000,  unit: 'ml', minStock: 500  },
    { name: 'Chocolate',          quantity: 500,   unit: 'g',  minStock: 100  },
    { name: 'Jarabe caramelo',    quantity: 800,   unit: 'ml', minStock: 200  },
    { name: 'Jarabe vainilla',    quantity: 800,   unit: 'ml', minStock: 200  },
    { name: 'Hielo',              quantity: 10000, unit: 'g',  minStock: 2000 },
    { name: 'Crema batida',       quantity: 500,   unit: 'ml', minStock: 100  },
    { name: 'Té chai',            quantity: 200,   unit: 'g',  minStock: 50   },
  ];
  await prisma.recipeIngredient.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "InventoryItem_id_seq" RESTART WITH 1`);
  const createdInv = await prisma.inventoryItem.createMany({ data: inventoryItems });
  await resetSequence('InventoryItem');
  console.log(`✅ ${createdInv.count} items de inventario`);

  const inv = await prisma.inventoryItem.findMany({ orderBy: { id: 'asc' } });
  const getInvId = (name: string) => inv.find(i => i.name.toLowerCase().includes(name.toLowerCase()))?.id ?? 0;

  // ── Productos ──────────────────────────────────────────────────────────────
  const productsData = [
    { name: 'Café Americano',  categoryId: 'hot',  price: 35, image: '☕',
      recipe: [{ name: 'Café molido', qty: 15 }] },
    { name: 'Cappuccino',      categoryId: 'hot',  price: 45, image: '☕',
      recipe: [{ name: 'Café molido', qty: 15 }, { name: 'Leche entera', qty: 150 }] },
    { name: 'Latte',           categoryId: 'hot',  price: 45, image: '☕',
      recipe: [{ name: 'Café molido', qty: 15 }, { name: 'Leche entera', qty: 200 }] },
    { name: 'Mocha',           categoryId: 'hot',  price: 50, image: '☕',
      recipe: [{ name: 'Café molido', qty: 15 }, { name: 'Leche entera', qty: 150 }, { name: 'Chocolate', qty: 20 }] },
    { name: 'Té Chai',         categoryId: 'hot',  price: 40, image: '🍵',
      recipe: [{ name: 'Té chai', qty: 5 }, { name: 'Leche entera', qty: 200 }] },
    { name: 'Frappé Moka',     categoryId: 'cold', price: 55, image: '🥤',
      recipe: [{ name: 'Café molido', qty: 15 }, { name: 'Leche entera', qty: 150 }, { name: 'Chocolate', qty: 30 }, { name: 'Hielo', qty: 100 }] },
    { name: 'Frappé Caramelo', categoryId: 'cold', price: 55, image: '🥤',
      recipe: [{ name: 'Café molido', qty: 15 }, { name: 'Leche entera', qty: 150 }, { name: 'Jarabe caramelo', qty: 30 }, { name: 'Hielo', qty: 100 }] },
    { name: 'Frappé Vainilla', categoryId: 'cold', price: 55, image: '🥤',
      recipe: [{ name: 'Café molido', qty: 15 }, { name: 'Leche entera', qty: 150 }, { name: 'Jarabe vainilla', qty: 30 }, { name: 'Hielo', qty: 100 }] },
    { name: 'Café Frío',       categoryId: 'cold', price: 40, image: '🥤',
      recipe: [{ name: 'Café molido', qty: 15 }, { name: 'Hielo', qty: 100 }] },
    { name: 'Limonada',        categoryId: 'cold', price: 35, image: '🍋', recipe: [] },
    { name: 'Croissant',       categoryId: 'food', price: 30, image: '🥐', recipe: [] },
    { name: 'Muffin',          categoryId: 'food', price: 35, image: '🧁', recipe: [] },
    { name: 'Bagel',           categoryId: 'food', price: 40, image: '🥯', recipe: [] },
    { name: 'Sandwich',        categoryId: 'food', price: 60, image: '🥪', recipe: [] },
    { name: 'Galletas',        categoryId: 'food', price: 25, image: '🍪', recipe: [] },
  ];

  await prisma.productModifierGroup.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Product_id_seq" RESTART WITH 1`);

  for (const p of productsData) {
    const product = await prisma.product.create({
      data: { name: p.name, categoryId: p.categoryId, price: p.price, image: p.image },
    });
    if (p.recipe.length > 0) {
      await prisma.recipeIngredient.createMany({
        data: p.recipe.map(r => ({
          productId: product.id,
          inventoryItemId: getInvId(r.name),
          quantity: r.qty,
        })).filter(r => r.inventoryItemId > 0),
      });
    }
  }
  await resetSequence('Product');
  await resetSequence('RecipeIngredient');
  console.log(`✅ ${productsData.length} productos`);

  // ── Grupos de Modificadores ─────────────────────────────────────────────────
  // Ahora incluyen color, appliesTo y kind
  await prisma.modifierOption.deleteMany({});
  await prisma.modifierGroup.deleteMany({});
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "ModifierGroup_id_seq" RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "ModifierOption_id_seq" RESTART WITH 1`);

  const endulzante = await prisma.modifierGroup.create({
    data: {
      name: 'Endulzante', inputType: 'single', required: false, position: 0,
      color: 'amber', appliesTo: [], kind: 'custom',
    },
  });
  await prisma.modifierOption.createMany({
    data: ['Sin azúcar', 'Azúcar normal', 'Stevia', 'Splenda'].map((name, i) => ({
      name, extraPrice: 0, position: i, groupId: endulzante.id,
    })),
  });

  const temperatura = await prisma.modifierGroup.create({
    data: {
      name: 'Temperatura', inputType: 'single', required: false, position: 1,
      color: 'blue', appliesTo: ['hot'], kind: 'custom',
    },
  });
  await prisma.modifierOption.createMany({
    data: ['Muy caliente', 'Normal', 'Tibio'].map((name, i) => ({
      name, extraPrice: 0, position: i, groupId: temperatura.id,
    })),
  });

  await resetSequence('ModifierGroup');
  await resetSequence('ModifierOption');
  console.log('✅ Grupos de modificadores (con color, appliesTo, kind)');

  console.log('\n🎉 Seed completado!');
  console.log('──────────────────────────────────────');
  console.log('  abraham@tecnm.mx  /  admin123  (Admin)');
  console.log('  mario@tecnm.mx    /  1234      (Cajero)');
  console.log('  diego@tecnm.mx    /  1234      (Cajero)');
  console.log('  ana@tecnm.mx      /  1234      (Mesero)');
  console.log('  luis@tecnm.mx     /  1234      (Cajero)');
}

main()
  .catch(e => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
