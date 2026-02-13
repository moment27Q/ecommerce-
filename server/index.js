import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import twilio from 'twilio';
import { db, initDb, ensurePromoBannersTable, ensureCategoriesTable, ensureFilterGroupsTable, ensureServicesTable } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'clave-secreta-cambiar-en-produccion';
const PORT = process.env.PORT || 3002;

// Twilio Config
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const TWILIO_TO_NUMBER = process.env.TWILIO_TO_NUMBER;

function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

initDb();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.post('/api/contact/sms', async (req, res) => {
  const { fullName, email, subject, message } = req.body || {};

  if (!message) {
    return res.status(400).json({ error: 'El mensaje es obligatorio' });
  }

  const body = `Nuevo mensaje de contacto:\n\n` +
    (fullName ? `Nombre: ${fullName}\n` : '') +
    (email ? `Correo: ${email}\n` : '') +
    (subject ? `Asunto: ${subject}\n` : '') +
    `Mensaje:\n${message}`;

  try {
    const client = getTwilioClient();
    if (!client) {
      return res.status(500).json({
        error: 'Twilio no está configurado',
        details: 'Faltan TWILIO_ACCOUNT_SID y/o TWILIO_AUTH_TOKEN en variables de entorno',
      });
    }
    if (!TWILIO_FROM_NUMBER || !TWILIO_TO_NUMBER) {
      return res.status(500).json({
        error: 'Twilio no está configurado',
        details: 'Faltan TWILIO_FROM_NUMBER y/o TWILIO_TO_NUMBER en variables de entorno',
      });
    }

    const msg = await client.messages.create({
      body: body,
      from: TWILIO_FROM_NUMBER,
      to: TWILIO_TO_NUMBER
    });

    console.log('SMS sent:', msg.sid);
    res.json({ success: true, sid: msg.sid });
  } catch (error) {
    console.error('Error sending SMS:', error);
    // Return detailed error so we can debug if the number is missing
    res.status(500).json({ error: 'Error enviando SMS', details: error.message });
  }
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

app.get('/api/products', (req, res) => {
  const rows = db.prepare('SELECT id, name, price, image, category, description, stock, rating, original_price AS originalPrice, tag FROM products ORDER BY id').all();
  res.json(rows.map((r) => ({ ...r, originalPrice: r.originalPrice ?? undefined, rating: r.rating ?? undefined, tag: r.tag ?? undefined })));
});

app.get('/api/products/:id', (req, res) => {
  const row = db.prepare('SELECT id, name, price, image, category, description, stock, rating, original_price AS originalPrice, tag FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json({ ...row, originalPrice: row.originalPrice ?? undefined, rating: row.rating ?? undefined, tag: row.tag ?? undefined });
});

app.post('/api/products', authMiddleware, (req, res) => {
  const { name, price, image, category, description, stock, rating, originalPrice, tag } = req.body;
  if (!name || price == null || !category || stock == null) return res.status(400).json({ error: 'Faltan campos requeridos' });
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  db.prepare('INSERT INTO products (id, name, price, image, category, description, stock, rating, original_price, tag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, name, Number(price), image || '/product-drill.jpg', category, description || '', Number(stock), rating != null ? Number(rating) : null, originalPrice != null ? Number(originalPrice) : null, tag || null);
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.status(201).json({ id: row.id, name: row.name, price: row.price, image: row.image, category: row.category, description: row.description, stock: row.stock, rating: row.rating ?? undefined, originalPrice: row.original_price ?? undefined, tag: row.tag ?? undefined });
});

app.put('/api/products/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, price, image, category, description, stock, rating, originalPrice, tag } = req.body;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' });
  db.prepare('UPDATE products SET name=?, price=?, image=?, category=?, description=?, stock=?, rating=?, original_price=?, tag=? WHERE id=?')
    .run(name ?? existing.name, price != null ? Number(price) : existing.price, image ?? existing.image, category ?? existing.category, description ?? existing.description, stock != null ? Number(stock) : existing.stock, rating != null ? Number(rating) : null, originalPrice != null ? Number(originalPrice) : null, tag ?? null, id);
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json({ id: row.id, name: row.name, price: row.price, image: row.image, category: row.category, description: row.description, stock: row.stock, rating: row.rating ?? undefined, originalPrice: row.original_price ?? undefined, tag: row.tag ?? undefined });
});

app.delete('/api/products/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  try {
    db.pragma('foreign_keys = OFF');
    db.prepare('DELETE FROM order_items WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM offers WHERE product_id = ?').run(id);
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.status(204).send();
  } finally {
    db.pragma('foreign_keys = ON');
  }
});

// Categorías (público)
app.get('/api/categories', (req, res) => {
  ensureCategoriesTable();
  const rows = db.prepare('SELECT id, name, icon, sort_order AS sortOrder, filter_key AS filterKey FROM categories ORDER BY sort_order ASC, name ASC').all();
  res.json(rows.map((r) => ({ id: String(r.id), name: r.name, icon: r.icon || 'Wrench', sortOrder: r.sortOrder ?? 0, filterKey: r.filterKey ?? null })));
});

// Categorías (admin)
app.post('/api/categories', authMiddleware, (req, res) => {
  ensureCategoriesTable();
  const { name, icon, filterKey } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
  const count = db.prepare('SELECT COUNT(*) as n FROM categories').get();
  const sortOrder = count.n;
  try {
    db.prepare('INSERT INTO categories (name, icon, sort_order, filter_key) VALUES (?, ?, ?, ?)')
      .run(name.trim(), (icon && String(icon).trim()) || 'Wrench', sortOrder, (filterKey && String(filterKey).trim()) || null);
  } catch (e) {
    if (e && e.message && e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
    throw e;
  }
  const row = db.prepare('SELECT id, name, icon, sort_order AS sortOrder, filter_key AS filterKey FROM categories ORDER BY id DESC LIMIT 1').get();
  res.status(201).json({ id: String(row.id), name: row.name, icon: row.icon || 'Wrench', sortOrder: row.sortOrder, filterKey: row.filterKey ?? null });
});

app.put('/api/categories/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, icon, sortOrder, filterKey } = req.body || {};
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Categoría no encontrada' });
  const newName = name !== undefined ? String(name).trim() : existing.name;
  if (!newName) return res.status(400).json({ error: 'El nombre no puede estar vacío' });
  try {
    db.prepare('UPDATE categories SET name = ?, icon = ?, sort_order = ?, filter_key = ? WHERE id = ?')
      .run(newName, (icon !== undefined ? String(icon) : existing.icon) || 'Wrench', sortOrder != null ? Number(sortOrder) : existing.sort_order, filterKey !== undefined ? (filterKey && String(filterKey).trim()) || null : existing.filter_key, id);
  } catch (e) {
    if (e && e.message && e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
    throw e;
  }
  const row = db.prepare('SELECT id, name, icon, sort_order AS sortOrder, filter_key AS filterKey FROM categories WHERE id = ?').get(id);
  res.json({ id: String(row.id), name: row.name, icon: row.icon || 'Wrench', sortOrder: row.sortOrder, filterKey: row.filterKey ?? null });
});

app.delete('/api/categories/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
  res.status(204).send();
});

// Grupos de filtro (sidebar tienda) — público
app.get('/api/filter-groups', (req, res) => {
  ensureFilterGroupsTable();
  const rows = db.prepare('SELECT id, name, key, sort_order AS sortOrder FROM filter_groups ORDER BY sort_order ASC, name ASC').all();
  res.json(rows.map((r) => ({ id: String(r.id), name: r.name, key: r.key, sortOrder: r.sortOrder ?? 0 })));
});

app.post('/api/filter-groups', authMiddleware, (req, res) => {
  ensureFilterGroupsTable();
  const { name, key } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const keyVal = (key != null && String(key).trim()) ? String(key).trim().toLowerCase().replace(/\s+/g, '-') : name.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 32);
  if (!keyVal) return res.status(400).json({ error: 'Indica un nombre para generar la clave' });
  const count = db.prepare('SELECT COUNT(*) as n FROM filter_groups').get();
  const sortOrder = count.n;
  try {
    db.prepare('INSERT INTO filter_groups (name, key, sort_order) VALUES (?, ?, ?)').run(name.trim(), keyVal, sortOrder);
  } catch (e) {
    if (e && e.message && e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ya existe un grupo con esa clave' });
    throw e;
  }
  const row = db.prepare('SELECT id, name, key, sort_order AS sortOrder FROM filter_groups ORDER BY id DESC LIMIT 1').get();
  res.status(201).json({ id: String(row.id), name: row.name, key: row.key, sortOrder: row.sortOrder });
});

app.put('/api/filter-groups/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, key, sortOrder } = req.body || {};
  const existing = db.prepare('SELECT * FROM filter_groups WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Grupo no encontrado' });
  const newName = name !== undefined ? String(name).trim() : existing.name;
  const newKey = key !== undefined ? String(key).trim().toLowerCase().replace(/\s+/g, '-') : existing.key;
  if (!newName) return res.status(400).json({ error: 'El nombre no puede estar vacío' });
  if (!newKey) return res.status(400).json({ error: 'La clave no puede estar vacía' });
  try {
    db.prepare('UPDATE filter_groups SET name = ?, key = ?, sort_order = ? WHERE id = ?')
      .run(newName, newKey, sortOrder != null ? Number(sortOrder) : existing.sort_order, id);
  } catch (e) {
    if (e && e.message && e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ya existe un grupo con esa clave' });
    throw e;
  }
  const row = db.prepare('SELECT id, name, key, sort_order AS sortOrder FROM filter_groups WHERE id = ?').get(id);
  res.json({ id: String(row.id), name: row.name, key: row.key, sortOrder: row.sortOrder });
});

app.delete('/api/filter-groups/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT key FROM filter_groups WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Grupo no encontrado' });
  db.prepare('UPDATE categories SET filter_key = NULL WHERE filter_key = ?').run(row.key);
  db.prepare('DELETE FROM filter_groups WHERE id = ?').run(id);
  res.status(204).send();
});

app.post('/api/orders', (req, res) => {
  const { id, customer, items, total, paymentMethod } = req.body;
  if (!id || !customer?.name || !customer?.phone || !customer?.address || !Array.isArray(items) || total == null || !paymentMethod) return res.status(400).json({ error: 'Datos del pedido incompletos' });
  db.prepare('INSERT INTO orders (id, customer_name, customer_phone, customer_address, customer_notes, total, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, customer.name, customer.phone, customer.address, customer.notes || null, Number(total), paymentMethod, 'pending');
  const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, product_price, product_image, quantity) VALUES (?, ?, ?, ?, ?, ?)');
  for (const it of items) insertItem.run(id, it.product.id, it.product.name, it.product.price, it.product.image, it.quantity);
  res.status(201).json({ id, status: 'pending' });
});

app.get('/api/orders', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT id, customer_name, customer_phone, customer_address, customer_notes, total, payment_method, status, created_at FROM orders ORDER BY created_at DESC').all();
  const orders = rows.map((row) => {
    const items = db.prepare('SELECT product_id AS productId, product_name AS productName, product_price AS productPrice, product_image AS productImage, quantity FROM order_items WHERE order_id = ?').all(row.id);
    return {
      id: row.id,
      customer: { name: row.customer_name, phone: row.customer_phone, address: row.customer_address, notes: row.customer_notes },
      items: items.map((i) => ({ product: { id: i.productId, name: i.productName, price: i.productPrice, image: i.productImage }, quantity: i.quantity })),
      total: row.total,
      paymentMethod: row.payment_method,
      status: row.status,
      createdAt: row.created_at,
    };
  });
  res.json(orders);
});

app.patch('/api/orders/:id/status', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['pending', 'paid', 'shipped', 'delivered', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Estado inválido' });
  const result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.json({ id, status });
});

// Carrusel (público)
app.get('/api/carousel', (req, res) => {
  const rows = db.prepare('SELECT id, image, alt, sort_order AS sortOrder FROM carousel_slides ORDER BY sort_order ASC').all();
  res.json(rows.map((r) => ({ id: r.id, src: r.image, alt: r.alt || '', sortOrder: r.sortOrder })));
});

// Carrusel (admin)
app.post('/api/carousel', authMiddleware, (req, res) => {
  const { image, alt } = req.body || {};
  if (!image || typeof image !== 'string' || !image.trim()) return res.status(400).json({ error: 'URL de imagen requerida' });
  const count = db.prepare('SELECT COUNT(*) as n FROM carousel_slides').get();
  const sortOrder = count.n;
  db.prepare('INSERT INTO carousel_slides (image, alt, sort_order) VALUES (?, ?, ?)').run(image.trim(), (alt && String(alt).trim()) || '', sortOrder);
  const row = db.prepare('SELECT id, image, alt, sort_order AS sortOrder FROM carousel_slides ORDER BY id DESC LIMIT 1').get();
  res.status(201).json({ id: row.id, src: row.image, alt: row.alt || '', sortOrder: row.sortOrder });
});

app.put('/api/carousel/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { image, alt, sortOrder } = req.body || {};
  const existing = db.prepare('SELECT * FROM carousel_slides WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Slide no encontrado' });
  db.prepare('UPDATE carousel_slides SET image = ?, alt = ?, sort_order = ? WHERE id = ?')
    .run(image != null ? String(image).trim() : existing.image, alt != null ? String(alt).trim() : existing.alt, sortOrder != null ? Number(sortOrder) : existing.sort_order, id);
  const row = db.prepare('SELECT id, image, alt, sort_order AS sortOrder FROM carousel_slides WHERE id = ?').get(id);
  res.json({ id: row.id, src: row.image, alt: row.alt || '', sortOrder: row.sortOrder });
});

app.delete('/api/carousel/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM carousel_slides WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Slide no encontrado' });
  const rows = db.prepare('SELECT id, sort_order FROM carousel_slides ORDER BY sort_order ASC').all();
  rows.forEach((row, i) => {
    if (row.sort_order !== i) db.prepare('UPDATE carousel_slides SET sort_order = ? WHERE id = ?').run(i, row.id);
  });
  res.status(204).send();
});

app.patch('/api/carousel/reorder', authMiddleware, (req, res) => {
  const { order } = req.body || {};
  if (!Array.isArray(order) || order.length === 0) return res.status(400).json({ error: 'order debe ser un array de ids' });
  order.forEach((id, i) => {
    db.prepare('UPDATE carousel_slides SET sort_order = ? WHERE id = ?').run(i, id);
  });
  const rows = db.prepare('SELECT id, image, alt, sort_order AS sortOrder FROM carousel_slides ORDER BY sort_order ASC').all();
  res.json(rows.map((r) => ({ id: r.id, src: r.image, alt: r.alt || '', sortOrder: r.sortOrder })));
});

// Banners promocionales (público)
app.get('/api/promo-banners', (req, res) => {
  const rows = db.prepare('SELECT id, image, title, description, sort_order AS sortOrder FROM promo_banners ORDER BY sort_order ASC').all();
  res.json(rows.map((r) => ({ id: r.id, image: r.image, title: r.title || '', description: r.description || '', sortOrder: r.sortOrder })));
});

// Banners promocionales (admin)
app.post('/api/promo-banners', authMiddleware, (req, res) => {
  ensurePromoBannersTable();
  try {
    const { image, title, description } = req.body || {};
    if (!image || typeof image !== 'string' || !image.trim()) return res.status(400).json({ error: 'URL de imagen requerida' });
    const count = db.prepare('SELECT COUNT(*) as n FROM promo_banners').get();
    const sortOrder = count.n;
    db.prepare('INSERT INTO promo_banners (image, title, description, sort_order) VALUES (?, ?, ?, ?)')
      .run(image.trim(), (title && String(title).trim()) || '', (description && String(description).trim()) || '', sortOrder);
    const row = db.prepare('SELECT id, image, title, description, sort_order AS sortOrder FROM promo_banners ORDER BY id DESC LIMIT 1').get();
    res.status(201).json({ id: row.id, image: row.image, title: row.title || '', description: row.description || '', sortOrder: row.sortOrder });
  } catch (err) {
    console.error('POST /api/promo-banners:', err);
    const msg = err && err.message ? err.message : 'Error al crear el banner';
    res.status(500).json({ error: msg });
  }
});

app.put('/api/promo-banners/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { image, title, description, sortOrder } = req.body || {};
  const existing = db.prepare('SELECT * FROM promo_banners WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Banner no encontrado' });
  db.prepare('UPDATE promo_banners SET image = ?, title = ?, description = ?, sort_order = ? WHERE id = ?')
    .run(image != null ? String(image).trim() : existing.image, title !== undefined ? String(title || '').trim() : existing.title, description !== undefined ? String(description || '').trim() : existing.description, sortOrder != null ? Number(sortOrder) : existing.sort_order, id);
  const row = db.prepare('SELECT id, image, title, description, sort_order AS sortOrder FROM promo_banners WHERE id = ?').get(id);
  res.json({ id: row.id, image: row.image, title: row.title || '', description: row.description || '', sortOrder: row.sortOrder });
});

app.delete('/api/promo-banners/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM promo_banners WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Banner no encontrado' });
  const rows = db.prepare('SELECT id, sort_order FROM promo_banners ORDER BY sort_order ASC').all();
  rows.forEach((row, i) => {
    if (row.sort_order !== i) db.prepare('UPDATE promo_banners SET sort_order = ? WHERE id = ?').run(i, row.id);
  });
  res.status(204).send();
});

app.patch('/api/promo-banners/reorder', authMiddleware, (req, res) => {
  const { order } = req.body || {};
  if (!Array.isArray(order) || order.length === 0) return res.status(400).json({ error: 'order debe ser un array de ids' });
  order.forEach((id, i) => {
    db.prepare('UPDATE promo_banners SET sort_order = ? WHERE id = ?').run(i, id);
  });
  const rows = db.prepare('SELECT id, image, title, description, sort_order AS sortOrder FROM promo_banners ORDER BY sort_order ASC').all();
  res.json(rows.map((r) => ({ id: r.id, image: r.image, title: r.title || '', description: r.description || '', sortOrder: r.sortOrder })));
});

// Ofertas (público): solo ofertas activas con datos del producto
function mapProductRow(r) {
  return { id: r.id, name: r.name, price: r.price, image: r.image, category: r.category, description: r.description, stock: r.stock, rating: r.rating ?? undefined, originalPrice: r.originalPrice ?? undefined, tag: r.tag ?? undefined };
}
app.get('/api/offers', (req, res) => {
  const now = new Date().toISOString().slice(0, 10);
  const rows = db.prepare(`
    SELECT o.id, o.product_id AS productId, o.discount_percent AS discountPercent, o.valid_until AS validUntil,
           p.id AS p_id, p.name AS p_name, p.price AS p_price, p.image AS p_image, p.category AS p_category,
           p.description AS p_description, p.stock AS p_stock, p.rating AS p_rating, p.original_price AS p_original_price, p.tag AS p_tag
    FROM offers o
    JOIN products p ON p.id = o.product_id
    WHERE o.valid_until IS NULL OR o.valid_until >= ?
    ORDER BY o.id DESC
  `).all(now);
  res.json(rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    discountPercent: r.discountPercent,
    validUntil: r.validUntil || undefined,
    product: mapProductRow({ id: r.p_id, name: r.p_name, price: r.p_price, image: r.p_image, category: r.p_category, description: r.p_description, stock: r.p_stock, rating: r.p_rating, originalPrice: r.p_original_price, tag: r.p_tag }),
  })));
});

// Ofertas (admin): listar todas
app.get('/api/offers/all', authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT o.id, o.product_id AS productId, o.discount_percent AS discountPercent, o.valid_until AS validUntil,
           p.id AS p_id, p.name AS p_name, p.price AS p_price, p.image AS p_image, p.category AS p_category,
           p.description AS p_description, p.stock AS p_stock, p.rating AS p_rating, p.original_price AS p_original_price, p.tag AS p_tag
    FROM offers o
    JOIN products p ON p.id = o.product_id
    ORDER BY o.id DESC
  `).all();
  res.json(rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    discountPercent: r.discountPercent,
    validUntil: r.validUntil || undefined,
    product: mapProductRow({ id: r.p_id, name: r.p_name, price: r.p_price, image: r.p_image, category: r.p_category, description: r.p_description, stock: r.p_stock, rating: r.p_rating, originalPrice: r.p_original_price, tag: r.p_tag }),
  })));
});

app.post('/api/offers', authMiddleware, (req, res) => {
  const { productId, discountPercent, validUntil } = req.body || {};
  if (!productId || discountPercent == null) return res.status(400).json({ error: 'Producto y descuento requeridos' });
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  const existing = db.prepare('SELECT id FROM offers WHERE product_id = ?').get(productId);
  if (existing) return res.status(400).json({ error: 'Este producto ya tiene una oferta' });
  db.prepare('INSERT INTO offers (product_id, discount_percent, valid_until) VALUES (?, ?, ?)').run(productId, Number(discountPercent), validUntil && String(validUntil).trim() ? String(validUntil).trim() : null);
  const row = db.prepare('SELECT o.id, o.product_id AS productId, o.discount_percent AS discountPercent, o.valid_until AS validUntil FROM offers o ORDER BY o.id DESC LIMIT 1').get();
  const p = db.prepare('SELECT id, name, price, image, category, description, stock, rating, original_price AS originalPrice, tag FROM products WHERE id = ?').get(productId);
  res.status(201).json({ id: row.id, productId: row.productId, discountPercent: row.discountPercent, validUntil: row.validUntil || undefined, product: mapProductRow(p) });
});

app.put('/api/offers/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { discountPercent, validUntil } = req.body || {};
  const existing = db.prepare('SELECT * FROM offers WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Oferta no encontrada' });
  db.prepare('UPDATE offers SET discount_percent = ?, valid_until = ? WHERE id = ?').run(discountPercent != null ? Number(discountPercent) : existing.discount_percent, validUntil !== undefined ? (validUntil && String(validUntil).trim() ? String(validUntil).trim() : null) : existing.valid_until, id);
  const row = db.prepare('SELECT o.id, o.product_id AS productId, o.discount_percent AS discountPercent, o.valid_until AS validUntil FROM offers o WHERE o.id = ?').get(id);
  const p = db.prepare('SELECT id, name, price, image, category, description, stock, rating, original_price AS originalPrice, tag FROM products WHERE id = ?').get(row.productId);
  res.json({ id: row.id, productId: row.productId, discountPercent: row.discountPercent, validUntil: row.validUntil || undefined, product: mapProductRow(p) });
});

app.delete('/api/offers/:id', authMiddleware, (req, res) => {
  if (result.changes === 0) return res.status(404).json({ error: 'Oferta no encontrada' });
  res.status(204).send();
});

// Servicios / Blog (Público)
app.get('/api/services', (req, res) => {
  ensureServicesTable();
  const rows = db.prepare('SELECT id, title, category, description, image, video, content, created_at FROM services ORDER BY created_at DESC').all();
  res.json(rows);
});

// Servicios / Blog (Admin)
app.post('/api/services', authMiddleware, (req, res) => {
  ensureServicesTable();
  const { title, category, description, image, video, content } = req.body || {};
  if (!title || !category || !description) return res.status(400).json({ error: 'Título, categoría y descripción son obligatorios' });

  db.prepare('INSERT INTO services (title, category, description, image, video, content) VALUES (?, ?, ?, ?, ?, ?)')
    .run(title.trim(), category.trim(), description.trim(), image || null, video || null, content || null);

  const row = db.prepare('SELECT * FROM services ORDER BY id DESC LIMIT 1').get();
  res.status(201).json(row);
});

app.put('/api/services/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { title, category, description, image, video, content } = req.body || {};

  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Servicio no encontrado' });

  db.prepare('UPDATE services SET title = ?, category = ?, description = ?, image = ?, video = ?, content = ? WHERE id = ?')
    .run(
      title ? title.trim() : existing.title,
      category ? category.trim() : existing.category,
      description ? description.trim() : existing.description,
      image !== undefined ? image : existing.image,
      video !== undefined ? video : existing.video,
      content !== undefined ? content : existing.content,
      id
    );

  const row = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  res.json(row);
});

app.delete('/api/services/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM services WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
  res.status(204).send();
});

app.listen(PORT, () => console.log('Servidor API en http://localhost:' + PORT));
