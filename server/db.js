import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'ecommerce.db');
export const db = new Database(dbPath);

// Desactivar comprobación de claves foráneas para poder eliminar productos
// aunque existan ofertas o ítems de pedidos que los referencien
db.pragma('foreign_keys = OFF');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT,
      category TEXT NOT NULL,
      description TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      rating REAL,
      original_price REAL,
      tag TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_address TEXT NOT NULL,
      customer_notes TEXT,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_price REAL NOT NULL,
      product_image TEXT,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE TABLE IF NOT EXISTS carousel_slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image TEXT NOT NULL,
      alt TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS promo_banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      discount_percent REAL NOT NULL,
      valid_until TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);
}

/** Asegura que la tabla categories exista y tenga datos iniciales. */
export function ensureCategoriesTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL DEFAULT 'Wrench',
      sort_order INTEGER NOT NULL DEFAULT 0,
      filter_key TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  const count = db.prepare('SELECT COUNT(*) as n FROM categories').get();
  if (count.n === 0) {
    const insert = db.prepare('INSERT INTO categories (name, icon, sort_order, filter_key) VALUES (?, ?, ?, ?)');
    const initial = [
      ['Herramientas Eléctricas', 'Zap', 0, 'tools'],
      ['Herramientas Manuales', 'Wrench', 1, 'tools'],
      ['Materiales de Construcción', 'Building2', 2, 'raw'],
      ['Pinturas y Acabados', 'Paintbrush', 3, 'landscaping'],
      ['Fontanería', 'Droplets', 4, 'landscaping'],
      ['Electricidad', 'Lightbulb', 5, 'safety'],
    ];
    initial.forEach(([name, icon, sortOrder, filterKey], i) => {
      insert.run(name, icon, sortOrder, filterKey);
    });
  }
}

/** Grupos del filtro lateral de la tienda (Herramientas, Materias primas, etc.). */
export function ensureFilterGroupsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS filter_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  const count = db.prepare('SELECT COUNT(*) as n FROM filter_groups').get();
  if (count.n === 0) {
    const insert = db.prepare('INSERT INTO filter_groups (name, key, sort_order) VALUES (?, ?, ?)');
    [
      ['Herramientas', 'tools', 0],
      ['Materias primas', 'raw', 1],
      ['Jardinería', 'landscaping', 2],
      ['Seguridad', 'safety', 3],
    ].forEach(([name, key, sortOrder], i) => insert.run(name, key, sortOrder));
  }
}

/** Asegura que la tabla promo_banners exista (por si el servidor no se reinició tras añadirla). */
export function ensurePromoBannersTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS promo_banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

/** Asegura que la tabla services exista (blog/servicios). */
export function ensureServicesTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      image TEXT,
      video TEXT,
      content TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
