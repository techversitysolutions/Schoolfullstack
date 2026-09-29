const app = require('./app');
const config = require('./config/config');
const { pool, testConnection, initializeDatabase } = require('./config/database');

let server;

const startServer = async () => {
  await initializeDatabase();

  const connected = await testConnection();

  if (!connected) {
    if (config.isProduction) {
      console.error('Production startup aborted because MySQL is unavailable.');
      process.exitCode = 1;
      return;
    }
    console.warn('Database connection failed. Server started without DB validation.');
  }

  server = await new Promise((resolve, reject) => {
    const httpServer = app.listen(config.port, () => resolve(httpServer));
    httpServer.once('error', reject);
  });
  console.log(`School backend running on port ${config.port}`);
};

const shutdown = () => {
  if (server) {
    server.close(() => {
      pool.end().catch((error) => console.error('Database pool shutdown failed:', error.message));
    });
    return;
  }

  pool.end().catch((error) => console.error('Database pool shutdown failed:', error.message));
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

startServer().catch(async (error) => {
  console.error('Backend startup failed:', error.message);
  await pool.end().catch(() => {});
  process.exitCode = 1;
});
