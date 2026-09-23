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
    return res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: error.message || 'Database connection degraded or offline',
      },
    } as ApiResponse);
  }
}
