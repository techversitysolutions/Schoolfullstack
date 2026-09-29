const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'school_database',
  port: Number(process.env.DB_PORT || 3306),
};
const isProduction = process.env.NODE_ENV === 'production';
const adminEmail = process.env.ADMIN_EMAIL || (isProduction ? '' : 'admin@example.com');
const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? '' : 'Admin123!');
const aboutPages = [
  {
    title: 'College Background',
    slug: 'college-background',
    meta_title: 'College Background',
    meta_description: 'Discover the learning purpose and shared foundations behind our school community.',
    featured_image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1600&q=85',
    content: '<h2>A place to learn and grow</h2><p>Our school brings learners, families, and educators together around a shared belief in the value of education. We work to create a welcoming place where students can build knowledge, discover interests, and develop confidence over time.</p><h2>Learning with purpose</h2><p>Strong foundations, thoughtful teaching, and steady practice help students prepare for the next stage of learning. We encourage curiosity, effort, creativity, and respect for different perspectives.</p><h2>A community shaped together</h2><p>Every student contributes to the life of the school. Through partnership with families and care for one another, we aim to make school a place where people feel included and able to do their best.</p>',
  },
  {
    title: 'Message from the Chairperson',
    slug: 'message-from-the-chairperson',
    meta_title: 'Message from the Chairperson',
    meta_description: 'A message about the shared responsibility of building a supportive place to learn.',
    featured_image: 'https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1600&q=85',
    content: '<h2>Education is a shared commitment</h2><p>A strong school is built through the daily efforts of students, families, teachers, and the wider community. Each person has a part in creating an environment where learners are encouraged, treated fairly, and given room to grow.</p><p>We value education that develops knowledge alongside kindness, responsibility, and confidence. By working together and keeping students at the centre of our decisions, we can make learning meaningful and prepare young people for a changing world.</p><p>Thank you to everyone who supports our school community and contributes to its continuing growth.</p>',
  },
  {
    title: 'Message from the Director',
    slug: 'message-from-the-director',
    meta_title: 'Message from the Director',
    meta_description: 'A message on thoughtful leadership, strong teaching, and opportunities for every learner.',
    featured_image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=85',
    content: '<h2>Making room for every learner</h2><p>Our aim is to provide a supportive setting in which students can take part, ask questions, and make progress. This takes clear purpose, careful planning, and a school culture built on trust and respect.</p><p>We continue to value strong teaching, relevant learning experiences, and open communication with families. When students feel supported and understand that effort matters, they are better placed to meet challenges and recognize their own growth.</p><p>We look forward to strengthening this work together as our school community develops.</p>',
  },
  {
    title: 'Message from the Principal',
    slug: 'message-from-the-principal',
    meta_title: 'Message from the Principal',
    meta_description: 'A welcome focused on curiosity, belonging, and steady progress in learning.',
    featured_image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=85',
    content: '<h2>Welcome to our school</h2><p>Every school day is an opportunity to learn something new, practise a skill, and contribute to the community around us. We want students to feel welcome, supported, and ready to take part.</p><p>We encourage learners to be curious, work with care, and treat one another with respect. Progress looks different for every student, and persistence, helpful feedback, and strong relationships all play an important role.</p><p>Families are valued partners in this work. We are glad to share the journey of learning and growth with you.</p>',
  },
  {
    title: 'Our Team',
    slug: 'team',
    meta_title: 'Our School Team',
    meta_description: 'Meet the educators and staff who support learning and school life every day.',
    featured_image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1600&q=85',
    content: '<h2>People who make school work</h2><p>Learning is supported by many people working together: teachers, school leaders, and staff who help create a safe, organized, and welcoming environment.</p><p>Our team values collaboration, care, and a shared focus on student growth. We encourage families and students to get to know the educators and staff who contribute to school life.</p><p><a href="/faculty">Explore the faculty and staff directory</a> to learn more about the people in our school community.</p>',
  },
  {
    title: 'Our Blogs',
    slug: 'our-blogs',
    meta_title: 'Our Blogs',
    meta_description: 'Stories, reflections, and updates from learning and life in our school community.',
    featured_image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1600&q=85',
    content: '<h2>Ideas from school life</h2><p>Our blog space is for sharing ideas, reflections, and moments that help tell the story of learning in our community. It can highlight student projects, classroom experiences, events, and useful perspectives from educators and families.</p><p>New stories can be added through the school content team as they become available. For current announcements and event information, visit the <a href="/notices-events">Notices and Events</a> page.</p>',
  },
];

if (isProduction && (!dbConfig.password || dbConfig.user.toLowerCase() === 'root')) {
  throw new Error('Production seeding requires a dedicated MySQL user with a password.');
}

if (isProduction && (!adminEmail || Buffer.byteLength(adminPassword, 'utf8') < 16 || Buffer.byteLength(adminPassword, 'utf8') > 72)) {
  throw new Error('Production seeding requires ADMIN_EMAIL and an ADMIN_PASSWORD between 16 and 72 bytes.');
}

const createSchema = async (connection) => {
  await connection.execute(`
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
  `);

  await connection.execute(`
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
  `);

  await connection.execute(`
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
  `);

  await connection.execute(`
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
  `);

  await connection.execute(`
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
  `);

  await connection.execute(`
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
  `);

  await connection.execute(`
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
  `);

  await connection.execute(`
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
  `);

  await connection.execute(`
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
  `);

  await connection.execute(`
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
  `);

  await connection.execute(`
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
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_name VARCHAR(255),
      tagline VARCHAR(255),
      logo VARCHAR(255),
      favicon VARCHAR(255),
      hero_image VARCHAR(255),
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
  `);

  const [heroImageColumn] = await connection.execute(
    "SELECT COUNT(*) AS column_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_settings' AND COLUMN_NAME = 'hero_image'"
  );
  if (!heroImageColumn[0].column_exists) {
    await connection.execute('ALTER TABLE site_settings ADD COLUMN hero_image VARCHAR(255) AFTER favicon');
  }

  await connection.execute(`
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
  `);
};

const seedDemoData = async (connection) => {
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);

  await connection.execute(
    `INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE password = VALUES(password), role = VALUES(role), status = VALUES(status)`,
    ['System Admin', adminEmail, hashedAdminPassword, 'admin', 'active']
  );

  if (!isProduction) {
    const editorPassword = await bcrypt.hash('Editor123!', 12);
    await connection.execute(
      `INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password = VALUES(password), role = VALUES(role), status = VALUES(status)`,
      ['Content Editor', 'editor@example.com', editorPassword, 'editor', 'active']
    );
  }

  const [settingsRows] = await connection.query('SELECT id FROM site_settings LIMIT 1');
  if (!settingsRows.length) {
    await connection.execute(`
      INSERT INTO site_settings (
        school_name,
        tagline,
        address,
        phone,
        email,
        whatsapp,
        facebook,
        instagram,
        youtube,
        office_hours,
        about_short,
        footer_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'School Name',
      'Learning community',
      'Main Campus Road, City, Country',
      '+1234567890',
      'info@example.com',
      '+1234567890',
      'https://facebook.com',
      'https://instagram.com',
      'https://youtube.com',
      'Mon-Fri: 8:00 AM - 4:00 PM',
      'A modern learning community focused on excellence, character, and opportunity.',
      '© 2026 School Name. All rights reserved.'
    ]);
  }

  const [pageRows] = await connection.query('SELECT id FROM pages WHERE slug = ?', ['about']);
  if (!pageRows.length) {
    await connection.execute(
      'INSERT INTO pages (title, slug, content, featured_image, meta_title, meta_description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        'About Us',
        'about',
        '<h2>Welcome to Our School</h2><p>Our school is a learning community where students are encouraged to build knowledge, confidence, curiosity, and care for others. We value each learner and work to create an environment where everyone can take part and make progress.</p><h2>Our Purpose</h2><p>We aim to give students a strong foundation for lifelong learning. Through thoughtful teaching, meaningful practice, and supportive guidance, students can develop the skills and habits they need for future study, work, and community life.</p><h2>Learning Together</h2><ul><li>Build strong foundations in literacy, numeracy, and essential subjects.</li><li>Encourage questions, problem-solving, creativity, and independent thinking.</li><li>Help students learn through collaboration, reflection, and steady effort.</li><li>Support wellbeing, respect, responsibility, and a sense of belonging.</li></ul><h2>Our Values</h2><p>Respect, honesty, compassion, responsibility, and curiosity guide the way we learn and work together. We encourage students to listen to different perspectives, contribute positively, and take pride in their growth.</p><h2>School and Family Partnership</h2><p>Education is strongest when students, families, and educators work together. We value open communication and shared support as students discover their strengths, meet challenges, and prepare for the opportunities ahead.</p>',
        'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1600&q=85',
        'About Our School',
        'Learn about our school community, educational purpose, learning approach, and shared values.',
        'published'
      ]
    );
  }
  await connection.execute(
    'UPDATE pages SET featured_image = ? WHERE slug = ? AND (featured_image IS NULL OR featured_image = ?)',
    ['https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1600&q=85', 'about', '']
  );

  for (const page of aboutPages) {
    const [existingRows] = await connection.query('SELECT id FROM pages WHERE slug = ? LIMIT 1', [page.slug]);
    if (existingRows.length) continue;

    await connection.execute(
      'INSERT INTO pages (title, slug, content, featured_image, meta_title, meta_description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [page.title, page.slug, page.content, page.featured_image, page.meta_title, page.meta_description, 'published']
    );
  }

  const [facultyRows] = await connection.query('SELECT id FROM faculty LIMIT 1');
  if (!facultyRows.length) {
    await connection.execute(
      'INSERT INTO faculty (name, slug, position, department, qualification, bio, display_order, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['Sample Principal', 'sample-principal', 'Principal', 'Administration', 'M.Ed.', 'Experienced leader committed to student-centred learning.', 1, 'published']
    );
  }
};

const run = async () => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
    await connection.query(`USE \`${dbConfig.database}\`;`);
    await createSchema(connection);
    await seedDemoData(connection);
    console.log('Database setup complete.');
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
};

run();
