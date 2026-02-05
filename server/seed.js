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
console.log('Productos insertados.');

const carouselCount = db.prepare('SELECT COUNT(*) as n FROM carousel_slides').get();
if (carouselCount.n === 0) {
  const insertSlide = db.prepare('INSERT INTO carousel_slides (image, alt, sort_order) VALUES (?, ?, ?)');
  [
    ['/hero-banner.jpg', 'Obra en construcción', 0],
    ['/promo-tools.jpg', 'Herramientas', 1],
    ['/promo-materials.jpg', 'Materiales', 2],
    ['/promo-shipping.jpg', 'Envíos', 3],
  ].forEach(([image, alt], i) => insertSlide.run(image, alt, i));
  console.log('Carrusel: slides iniciales insertados.');
}
console.log('Seed completado.');
