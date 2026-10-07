import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables (.env)
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';

import customerRoutes from './routes/customerRoutes';
import companyRoutes from './routes/companyRoutes';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import priceListRoutes from './routes/priceListRoutes';
import particularRoutes from './routes/particularRoutes';
import accountRoutes from './routes/accountRoutes';
import authRoutes from './routes/authRoutes';
import settingsRoutes from './routes/settingsRoutes';
import { seedDefaultAdmin } from './controllers/authController';

const app: Application = express();
const PORT = process.env.PORT || 5015;

// Connect Database & Seed default admin
connectDB().then(() => {
  seedDefaultAdmin();
});

// Configure CORS Origins
const envOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o: string) => o.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...envOrigins,
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5015',
  'http://127.0.0.1:5015',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://apsara-crackers.gemshine.tech',
  'http://apsara-crackers.gemshine.tech',
];

const corsOptions: cors.CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    // Allow wildcard in CORS_ORIGIN if specified
    if (process.env.CORS_ORIGIN === '*' || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    // Allow any localhost / 127.0.0.1 port or local network IPs
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin);

    if (isLocalhost || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Fallback for non-production environments
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    console.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
    return callback(new Error(`CORS origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Apply CORS middleware before all routes
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health Check Route
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Apsara Crackers API Server is running smoothly',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    service: 'Apsara Crackers Backend API',
    health: '/api/health',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/pricelists', priceListRoutes);
app.use('/api/particulars', particularRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/settings', settingsRoutes);

// Global Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(` 🚀 Apsara Crackers Server running on port ${PORT}`);
  console.log(` 🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(` 🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=============================================`);
});

export default app;
