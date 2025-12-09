import express from 'express';
import { AdminController } from './admin.controller';
import validateRequest from '../../middlewares/validateRequest';
import { adminValidationSchemas } from './admin.validations';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';



const router = express.Router();

router.get(
    '/',
    auth(UserRole.ADMIN),
    AdminController.getAllFromDB
);

// router.get(
//     '/:id',
//     auth( UserRole.ADMIN),
//     AdminController.getByIdFromDB
// );

router.patch(
    '/:id',
    auth( UserRole.ADMIN),
    validateRequest(adminValidationSchemas.update),
    AdminController.updateIntoDB
);

router.delete( 
    '/:id',
    auth( UserRole.ADMIN),
    AdminController.deleteFromDB
);


// ==================== HOST MANAGEMENT ====================
router.get(
    '/hosts',
    auth(UserRole.ADMIN),
    AdminController.getAllHosts
);

router.patch(
    '/hosts/:id/status',
    auth(UserRole.ADMIN),
    AdminController.updateHostStatus
);

router.delete(
    '/hosts/:id',
    auth(UserRole.ADMIN),
    AdminController.deleteHost
);

// ==================== HOST APPLICATION MANAGEMENT ====================
router.get("/events/pending-host-applications",auth(UserRole.ADMIN),AdminController.fetchPendingHostApplications);
router.patch('/:applicationId/approve', auth(UserRole.ADMIN),  AdminController.HostApprove);
router.patch('/:applicationId/reject', auth(UserRole.ADMIN),   AdminController.HostReject);

// ==================== EVENT MANAGEMENT ====================
router.get("/events/pending-event-applications",auth(UserRole.ADMIN),AdminController.fetchPendingEventApplications);
router.patch("/events/:id/approve", auth(UserRole.ADMIN), AdminController.approveEventController);
router.patch("/events/:id/reject",  auth(UserRole.ADMIN),AdminController.rejectEventController);

export const AdminRoutes = router;