const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const os = require('os');
const path = require('path');
const config = require('./config/config');
const { pool } = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimiters');
const authRoutes = require('./routes/authRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const eventRoutes = require('./routes/eventRoutes');
const academicRoutes = require('./routes/academicRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const pageRoutes = require('./routes/pageRoutes');
const contactRoutes = require('./routes/contactRoutes');
const settingRoutes = require('./routes/settingRoutes');
const userRoutes = require('./routes/userRoutes');
const admissionRoutes = require('./routes/admissionRoutes');
const heroSlideRoutes = require('./routes/heroSlideRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();
const allowedFrontendOrigins = new Set(config.frontendUrls);

if (!config.isProduction) {
  allowedFrontendOrigins.add('http://localhost:5173');
  allowedFrontendOrigins.add('http://127.0.0.1:5173');
  Object.values(os.networkInterfaces()).flat().forEach((networkInterface) => {
    if (networkInterface && !networkInterface.internal && (networkInterface.family === 'IPv4' || networkInterface.family === 4)) {
      allowedFrontendOrigins.add(`http://${networkInterface.address}:5173`);
    }
  });
}

const isLocalFrontendOrigin = (origin) => {
  if (config.isProduction) return false;

  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  const port = Number(url.port || 80);
  if (url.protocol !== 'http:' || port < 5173 || port > 5199) return false;
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;

  const octets = url.hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  return octets[0] === 10
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
};

app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedFrontendOrigins.has(origin) || isLocalFrontendOrigin(origin)),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use('/api', apiLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb', parameterLimit: 100 }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'School backend is running', data: { status: 'ok' } });
});

app.get('/api/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: 'School backend is ready', data: { status: 'ready' } });
  } catch (error) {
    res.status(503).json({ success: false, message: 'Database is unavailable', data: { status: 'not_ready' } });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/academics', academicRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/hero-slides', heroSlideRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
