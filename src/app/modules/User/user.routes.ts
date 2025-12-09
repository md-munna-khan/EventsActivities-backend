import { UserRole } from '@prisma/client';
import express, { NextFunction, Request, Response } from 'express';

import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { userValidation } from './user.validation';
import { userController } from './user.controller';
import { multerUpload } from '../../../config/multer.config';


const router = express.Router();

router.get(
    '/',
    auth(UserRole.ADMIN),
    userController.getAllFromDB
);

router.get(
    '/me',
    auth( UserRole.ADMIN, UserRole.CLIENT,UserRole.HOST),
    userController.getMyProfile
)

router.post(
    "/create-admin",
    auth( UserRole.ADMIN),
   multerUpload.single('file'),
    (req: Request, res: Response, next: NextFunction) => {
        req.body = userValidation.createAdmin.parse(JSON.parse(req.body.data))
        return userController.createAdmin(req, res, next)
    }
);



router.post(
    "/create-client",
    multerUpload.single('file'),
    (req: Request, res: Response, next: NextFunction) => {
        req.body = userValidation.createClient.parse(JSON.parse(req.body.data))
        console.log(req.body)
        return userController.createClient(req, res, next)
    }
);

router.patch(
    '/:id/status',
    auth( UserRole.ADMIN),
    validateRequest(userValidation.updateStatus),
    userController.changeProfileStatus
);

router.patch(
    "/update-my-profile",
    auth( UserRole.ADMIN, UserRole.CLIENT,UserRole.HOST),
   multerUpload.single('file'),
    (req: Request, res: Response, next: NextFunction) => {
        req.body = JSON.parse(req.body.data)
        return userController.updateMyProfile(req, res, next)
    }
);

router.delete(
    '/:id',
    auth( UserRole.ADMIN),
    userController.deleteUser
);
export const userRoutes = router;