require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/db');

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in .env');
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error('FATAL ERROR: MONGO_URI is not defined in .env');
  process.exit(1);
}

let server;
let isShuttingDown = false;

const shutdown = async (reason, error = null) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  if (error) {
    console.error(`Fatal ${reason}:`, error);
  } else {
    console.log(`Received ${reason}. Shutting down gracefully...`);
  }

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
    }
  } finally {
    process.exit(error ? 1 : 0);
  }
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('unhandledRejection', (reason) => {
  void shutdown('unhandledRejection', reason);
});

process.on('uncaughtException', (error) => {
  void shutdown('uncaughtException', error);
});

const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 3001;

  server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
