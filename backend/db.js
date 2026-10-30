const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'rental.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('customer','owner','admin')),
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  property_type TEXT DEFAULT 'apartment',
  address TEXT,
  city TEXT,
  neighborhood TEXT,
  country TEXT,
  price_per_night REAL NOT NULL, -- kept column name so DB queries don't break, but it represents monthly price now
  bedrooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  max_guests INTEGER DEFAULT 2,
  area_sqft INTEGER DEFAULT 500,
  floor_number INTEGER,
  year_built INTEGER,
  furnished TEXT DEFAULT 'unfurnished',
  amenities TEXT DEFAULT '[]',
  rules TEXT DEFAULT '[]',
  images TEXT DEFAULT '[]',
  contact_phone TEXT,
  status TEXT DEFAULT 'available' CHECK(status IN ('available','pending_payment','rejected')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  guests INTEGER DEFAULT 1,
  total_price REAL NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK(status IN ('pending','confirmed','declined','cancelled','completed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(property_id) REFERENCES properties(id),
  FOREIGN KEY(customer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  method TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','paid','failed','refunded')),
  transaction_ref TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(booking_id) REFERENCES bookings(id)
);

CREATE TABLE IF NOT EXISTS service_fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  booking_id INTEGER,
  property_id INTEGER,
  role TEXT NOT NULL CHECK(role IN ('customer','owner')),
  amount REAL NOT NULL,
  method TEXT NOT NULL,
  status TEXT DEFAULT 'paid' CHECK(status IN ('pending','paid','failed')),
  transaction_ref TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  property_id INTEGER,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cleaning_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','done','cancelled')),
  FOREIGN KEY(property_id) REFERENCES properties(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// ============================================================
// SEED DEMO USERS (No properties — you will add them)
// ============================================================
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;

if (userCount === 0) {
  const hash = (p) => bcrypt.hashSync(p, 10);
  const insUser = db.prepare(
    'INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)'
  );

  insUser.run('admin',      'admin@demo.com', hash('admin123'), 'admin');
  insUser.run('host_john',  'john@demo.com',  hash('123456'), 'owner');
  insUser.run('host_mary',  'mary@demo.com',  hash('123456'), 'owner');
  insUser.run('alice',      'alice@demo.com', hash('123456'), 'customer');
  insUser.run('bob',        'bob@demo.com',   hash('123456'), 'customer');

  console.log('✅ Seeded admin: admin@demo.com / admin123');
  console.log('✅ Seeded owners: john@demo.com, mary@demo.com  (password: 123456)');
  console.log('✅ Seeded customers: alice@demo.com, bob@demo.com  (password: 123456)');
}

module.exports = db;