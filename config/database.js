const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  port: config.db.port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

const createSchemaSQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','editor') NOT NULL DEFAULT 'editor',
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS webauthn_credentials (
    credential_id VARCHAR(1500) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id INT NOT NULL,
    public_key MEDIUMTEXT NOT NULL,
    counter BIGINT UNSIGNED NOT NULL DEFAULT 0,
    transports JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_webauthn_credentials_user (user_id),
    CONSTRAINT fk_webauthn_credentials_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS webauthn_challenges (
    challenge VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id INT NULL,
    purpose ENUM('registration', 'authentication') NOT NULL,
    origin VARCHAR(255) NOT NULL,
    rp_id VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    INDEX idx_webauthn_challenges_expiry (expires_at),
    CONSTRAINT fk_webauthn_challenges_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS faculty (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    position VARCHAR(255),
    department VARCHAR(255),
    qualification VARCHAR(255),
    bio TEXT,
    image VARCHAR(255),
    display_order INT DEFAULT 0,
    status ENUM('draft','published') DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(255) DEFAULT 'General',
    short_description TEXT,
    content LONGTEXT,
    featured_image VARCHAR(255),
    published_date DATETIME,
    status ENUM('draft','published') DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    event_date DATETIME,
    event_end_date DATETIME,
    location VARCHAR(255),
    image VARCHAR(255),
    category VARCHAR(255) DEFAULT 'General',
    status ENUM('draft','published') DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS academics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    level VARCHAR(255),
    description TEXT,
    learning_method VARCHAR(255),
    subjects TEXT,
    display_order INT DEFAULT 0,
    status ENUM('draft','published') DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS gallery (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image VARCHAR(255),
    category VARCHAR(255) DEFAULT 'School Life',
    caption TEXT,
    display_order INT DEFAULT 0,
    status ENUM('draft','published') DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content LONGTEXT,
    meta_title VARCHAR(255),
    meta_description TEXT,
    featured_image VARCHAR(255),
    status ENUM('draft','published') DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(255),
    subject VARCHAR(255),
    message TEXT,
    status ENUM('new','read','replied','archived') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS hero_slides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    short_message TEXT,
    media_type ENUM('image','video','color') NOT NULL DEFAULT 'image',
    image_path VARCHAR(255),
    video_url TEXT,
    background_color CHAR(7) NOT NULL DEFAULT '#29235c',
    button_text VARCHAR(100),
    button_link VARCHAR(500),
    display_order INT NOT NULL DEFAULT 0,
    status ENUM('draft','published') NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_name VARCHAR(255),
    tagline VARCHAR(255),
    logo VARCHAR(255),
    favicon VARCHAR(255),
    hero_image VARCHAR(255),
    promotion_media VARCHAR(255),
    promotion_media_2 VARCHAR(255),
    promotion_media_3 VARCHAR(255),
    address TEXT,
    phone VARCHAR(255),
    email VARCHAR(255),
    whatsapp VARCHAR(255),
    facebook VARCHAR(255),
    instagram VARCHAR(255),
    youtube VARCHAR(255),
    map_url TEXT,
    office_hours VARCHAR(255),
    about_short TEXT,
    footer_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admission_enquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    guardian_name VARCHAR(255),
    phone VARCHAR(255),
    email VARCHAR(255),
    grade VARCHAR(255),
    message TEXT,
    status ENUM('new','contacted','processing','completed','archived') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );
`;

const initializeDatabase = async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.db.host,
      user: config.db.user,
      password: config.db.password,
      port: config.db.port,
      multipleStatements: true,
    });

    const safeDatabaseName = String(config.db.database).replace(/`/g, '``');
    await connection.query('CREATE DATABASE IF NOT EXISTS `' + safeDatabaseName + '`');
    await connection.query('USE `' + safeDatabaseName + '`');
    await connection.query(createSchemaSQL);
    const [taglineColumn] = await connection.query(
      "SELECT COUNT(*) AS column_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'site_settings' AND COLUMN_NAME = 'tagline'",
      [config.db.database]
    );
    if (!taglineColumn[0].column_exists) {
      await connection.query('ALTER TABLE site_settings ADD COLUMN tagline VARCHAR(255) AFTER school_name');
    }
    const [heroImageColumn] = await connection.query(
      "SELECT COUNT(*) AS column_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'site_settings' AND COLUMN_NAME = 'hero_image'",
      [config.db.database]
    );
    if (!heroImageColumn[0].column_exists) {
      await connection.query('ALTER TABLE site_settings ADD COLUMN hero_image VARCHAR(255) AFTER favicon');
    }
    const [promotionMediaColumn] = await connection.query(
      "SELECT COUNT(*) AS column_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'site_settings' AND COLUMN_NAME = 'promotion_media'",
      [config.db.database]
    );
    if (!promotionMediaColumn[0].column_exists) {
      await connection.query('ALTER TABLE site_settings ADD COLUMN promotion_media VARCHAR(255) AFTER hero_image');
    }
    for (const columnName of ['promotion_media_2', 'promotion_media_3']) {
      const [column] = await connection.query(
        'SELECT COUNT(*) AS column_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = \'site_settings\' AND COLUMN_NAME = ?',
        [config.db.database, columnName]
      );
      if (!column[0].column_exists) {
        await connection.query(`ALTER TABLE site_settings ADD COLUMN ${columnName} VARCHAR(255) AFTER ${columnName === 'promotion_media_2' ? 'promotion_media' : 'promotion_media_2'}`);
      }
    }
    await connection.query("UPDATE site_settings SET tagline = 'Learning community' WHERE tagline IS NULL OR tagline = ''");
    await connection.end();
    connection = null;
    console.log('Database schema checked and initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    if (config.isProduction) throw error;
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
};

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL connected');
    connection.release();
    return true;
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
    return false;
  }
};

module.exports = { pool, testConnection, initializeDatabase };
