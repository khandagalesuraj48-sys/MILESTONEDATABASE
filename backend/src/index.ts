import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import platformRouter from './modules/platform/platform.routes';
import interviewRouter from './modules/interview-master/interview.routes';
import { connectToDatabase } from './config/db';
import { initializeDatabaseIndexesAndSeeds } from './services/seed.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static Web Client Hosting
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Route Mounts
app.use('/api/v1', platformRouter);
app.use('/api/v1/interviews', interviewRouter);
app.use('/api/v1', interviewRouter);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Platform Error]', err);

  // Handle Multer upload errors
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: {
        code: err.code || 'UPLOAD_ERROR',
        message: err.message || 'File upload error',
      },
    });
  }

  // Handle fileFilter rejection (e.g. non-PDF)
  if (err.message && err.message.includes('Only PDF files')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: err.message,
      },
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected server error occurred',
    },
  });
});

// Database & Server Startup
async function startServer() {
  try {
    if (process.env.MONGODB_URI) {
      await connectToDatabase();
      await initializeDatabaseIndexesAndSeeds();
    } else {
      console.warn(
        '[Startup Notice] MONGODB_URI is not set in environment yet. Configure it in .env or Vercel dashboard.'
      );
    }
  } catch (dbError: any) {
    console.warn('[Startup Notice] MongoDB connection warning on boot:', dbError.message);
  }

  // Only listen when executed directly, not when required by Vercel serverless
  if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 MILESTONE DATABASE PLATFORM BACKEND`);
      console.log(`📡 Listening on: http://localhost:${PORT}`);
      console.log(`📦 Module #1 Active: INTERVIEW MASTER`);
      console.log(`====================================================`);
    });
  }
}

startServer();

export default app;
