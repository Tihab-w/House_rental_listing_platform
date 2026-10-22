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
  lat REAL,
  lng REAL,
  price_per_night REAL NOT NULL,
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
// SEED DEMO DATA (only runs when users table is empty)
// ============================================================
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;

if (userCount === 0) {
  const hash = (p) => bcrypt.hashSync(p, 10);

  // Prepared statements used for seeding
  const insUser = db.prepare(
    'INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)'
  );

  const insProp = db.prepare(`INSERT INTO properties
    (owner_id,title,description,property_type,address,city,neighborhood,country,
     lat,lng,price_per_night,bedrooms,bathrooms,max_guests,area_sqft,
     furnished,amenities,images,contact_phone,status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  // --- Users ---
  insUser.run('admin',      'admin@demo.com', hash('admin123'), 'admin');
  const owner1 = insUser.run('host_john', 'john@demo.com',  hash('123456'), 'owner').lastInsertRowid;
  const owner2 = insUser.run('host_mary', 'mary@demo.com',  hash('123456'), 'owner').lastInsertRowid;
  insUser.run('alice', 'alice@demo.com', hash('123456'), 'customer');
  insUser.run('bob',   'bob@demo.com',   hash('123456'), 'customer');

  // --- Properties ---
  insProp.run(
    owner1,
    'Sunny 2BR Apartment in Bole',
    'Modern apartment close to the airport with plenty of natural light and easy access to shops and restaurants.',
    'apartment', 'Bole Road 12', 'Addis Ababa', 'Bole', 'Ethiopia',
    0, 0, 55, 2, 1, 4, 850, 'furnished',
    JSON.stringify(['WiFi', 'Kitchen', 'Parking', 'Air Conditioning']),
    JSON.stringify([
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200'
    ]),
    '+251-911-111-111', 'available'
  );

  insProp.run(
    owner1,
    'Cozy Studio near Lake',
    'Peaceful studio with lake view, ideal for a quiet weekend getaway. Walking distance to the shore.',
    'studio', 'Lake Side 5', 'Hawassa', 'Lake Side', 'Ethiopia',
    0, 0, 30, 1, 1, 2, 400, 'semi-furnished',
    JSON.stringify(['WiFi', 'Kitchen', 'Lake View']),
    JSON.stringify([
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200'
    ]),
    '+251-911-222-222', 'available'
  );

  insProp.run(
    owner2,
    'Luxury Villa with Pool',
    'Spacious villa with private pool, perfect for families or groups. Includes daily cleaning service.',
    'villa', 'Summit 88', 'Addis Ababa', 'Kazanchis', 'Ethiopia',
    0, 0, 180, 4, 3, 8, 2400, 'furnished',
    JSON.stringify(['WiFi', 'Pool', 'Kitchen', 'Parking', 'Gym', 'Air Conditioning']),
    JSON.stringify([
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200'
    ]),
    '+251-911-333-333', 'available'
  );

  insProp.run(
    owner2,
    'Family House in Bahir Dar',
    'Quiet neighborhood, ideal for families. Large garden and safe area for children to play.',
    'house', 'Tana Ave 3', 'Bahir Dar', 'Tana Ave', 'Ethiopia',
    0, 0, 65, 3, 2, 6, 1200, 'semi-furnished',
    JSON.stringify(['WiFi', 'Kitchen', 'Parking', 'Garden']),
    JSON.stringify([
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200'
    ]),
    '+251-911-444-444', 'available'
  );

  console.log('✅ Seeded admin: admin@demo.com / admin123');
  console.log('✅ Seeded owners: john@demo.com, mary@demo.com  (password: 123456)');
  console.log('✅ Seeded customers: alice@demo.com, bob@demo.com  (password: 123456)');
}

module.exports = db;