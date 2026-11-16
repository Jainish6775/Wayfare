const dotenv = require('dotenv');
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || 'wayfare_default_jwt_secret_change_in_production';

if (nodeEnv === 'production' && !process.env.JWT_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET is using fallback value in production mode!');
}

module.exports = {
  port: process.env.PORT || 8000,
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL || '',
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
