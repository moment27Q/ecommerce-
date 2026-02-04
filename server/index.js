import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, initDb } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'clave-secreta-cambiar-en-produccion';
const PORT = process.env.PORT || 3001;
initDb();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

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
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Producto no encontrado' });
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

app.listen(PORT, () => console.log('Servidor API en http://localhost:' + PORT));
