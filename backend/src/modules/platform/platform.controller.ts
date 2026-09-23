import { Request, Response } from 'express';
import { Filter } from 'mongodb';
import { getDb, getModulesCollection } from '../../config/db';
import { ApiResponse, PlatformModule } from '../../models/types';

import { PLATFORM_MODULES_SEED } from '../../services/seed.service';

export async function getModules(req: Request, res: Response) {
  const includeAll = req.query.all === 'true';
  const filter: Filter<PlatformModule> = includeAll ? {} : { status: 'active' };

  try {
    const modulesCollection = await getModulesCollection();
    const modules = await modulesCollection.find(filter).sort({ order: 1 }).toArray();

    if (modules && modules.length > 0) {
      return res.json({
        success: true,
        data: modules,
        message: 'Active module registry retrieved successfully from MongoDB Atlas',
      } as ApiResponse<PlatformModule[]>);
    }
  } catch (error: any) {
    console.warn('[Platform] MongoDB fetch failed, using platform default registry:', error.message);
  }

  // Graceful fallback to static module registry (only active modules)
  const fallback = includeAll
    ? PLATFORM_MODULES_SEED
    : PLATFORM_MODULES_SEED.filter((m) => m.status === 'active');

  return res.json({
    success: true,
    data: fallback,
    message: 'Module registry retrieved from platform cache',
  } as ApiResponse<any[]>);
}


export async function healthCheck(req: Request, res: Response) {
  try {
    const db = await getDb();
    const pingResult = await db.command({ ping: 1 });
    const isDbConnected = pingResult.ok === 1;

    return res.json({
      success: true,
      data: {
        platform: 'MILESTONE DATABASE',
        status: 'online',
        database: isDbConnected ? 'connected' : 'degraded',
        cluster: 'Cluster0',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        version: '1.0.0',
      },
    } as ApiResponse);
  } catch (error: any) {
    const rawMsg = (error.message || '').toLowerCase();
    let safeMessage = 'Database connection is currently unavailable.';

    if (rawMsg.includes('ssl') || rawMsg.includes('tls') || rawMsg.includes('alert number 80')) {
      safeMessage = 'MongoDB Atlas rejected connection (TLS alert 80). Please ensure Atlas Network Access allows IP 0.0.0.0/0 for serverless hosting.';
    } else if (rawMsg.includes('not defined') || rawMsg.includes('mongodb_uri')) {
      safeMessage = 'MONGODB_URI environment variable is not configured on the server.';
    } else if (rawMsg.includes('timed out') || rawMsg.includes('serverselection')) {
      safeMessage = 'Database connection timed out. Cluster0 is currently unreachable.';
    }

    return res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: safeMessage,
      },
    } as ApiResponse);
  }
}
