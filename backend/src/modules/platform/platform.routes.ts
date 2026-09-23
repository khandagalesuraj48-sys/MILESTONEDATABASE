import { Router } from 'express';
import { getModules, healthCheck } from './platform.controller';

const router = Router();

router.get('/modules', getModules);
router.get('/health', healthCheck);

export default router;

