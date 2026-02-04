import bcrypt from 'bcryptjs';
import { db, initDb } from './db.js';
import { initialProducts } from './seed-data.js';

initDb();
const defaultPassword = 'admin123';
const hash = bcrypt.hashSync(defaultPassword, 10);
const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, password_hash) VALUES (?, ?)');
insertUser.run('admin', hash);
console.log('Usuario admin creado (contraseña: admin123)');

const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products (id, name, price, image, category, description, stock, rating, original_price, tag)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const p of initialProducts) {
  insertProduct.run(p.id, p.name, p.price, p.image, p.category, p.description, p.stock, p.rating ?? null, p.originalPrice ?? null, p.tag ?? null);
}
console.log('Productos insertados. Seed completado.');
