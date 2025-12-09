import express from 'express';
import { MetaController } from './meta.controller';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();

// Admin and Host dashboard meta
router.get('/', auth(UserRole.ADMIN), MetaController.fetchDashboardMetaData);

export const MetaRoutes = router;