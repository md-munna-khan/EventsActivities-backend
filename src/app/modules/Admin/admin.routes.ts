import express, { NextFunction, Request, Response } from 'express';
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


// host event approval/rejection routes
router.patch('/:applicationId/approve', auth(UserRole.ADMIN),  AdminController.HostApprove);
router.patch('/:applicationId/reject', auth(UserRole.ADMIN),   AdminController.HostReject);

// fetch pending events route
router.get("/events/pending",auth(UserRole.ADMIN),AdminController.fetchPendingHostApplications);
// approve an event
router.patch("/events/:id/approve", auth(UserRole.ADMIN), AdminController.approveEventController);

// reject an event
router.patch("/events/:id/reject",  auth(UserRole.ADMIN),AdminController.rejectEventController);

export const AdminRoutes = router;