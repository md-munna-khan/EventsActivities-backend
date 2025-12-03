import express from 'express';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { userRoutes } from '../modules/User/user.routes';
import { AdminRoutes } from '../modules/Admin/admin.routes';
import {  hostsRoutes } from '../modules/Host/host.routes';
import { eventsRoutes } from '../modules/Events/event.routes';
import { PaymentRoutes } from '../modules/Payment/payment.routes';
import { ReviewRoutes } from '../modules/Review/review.routes';
import { MetaRoutes } from '../modules/Meta/meta.routes';


const router = express.Router();

const moduleRoutes = [
    {
        path: '/auth',
        route: AuthRoutes
    },
    {
        path: '/user',
        route: userRoutes
    },
    {
        path: '/admin',
        route: AdminRoutes
    },
    {
        path: '/events',
        route: eventsRoutes
    },
    {
        path: '/hosts',
        route: hostsRoutes
    },
    {
        path: '/payment',
        route: PaymentRoutes
    },
    {
        path: '/reviews',
        route: ReviewRoutes
    },
    {
        path: '/meta',
        route: MetaRoutes
    },
    // Add more module routes here
    
];

moduleRoutes.forEach(route => router.use(route.path, route.route))

export default router;