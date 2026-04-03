require('dotenv').config();


// Validate critical environment variables
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in .env');
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error('FATAL ERROR: MONGO_URI is not defined in .env');
  process.exit(1);
}

const app = require('./app');
const connectDB = require('./config/db');

const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 3001;


  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });

};

startServer().catch((error) => {

  console.error('Failed to start server:', error);
  process.exit(1);
});
