import express from 'express';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { userRoutes } from '../modules/User/user.routes';
import { AdminRoutes } from '../modules/Admin/admin.routes';
import {  hostsRoutes } from '../modules/Host/host.routes';
import { eventsRoutes } from '../modules/Events/event.routes';


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

];

moduleRoutes.forEach(route => router.use(route.path, route.route))

export default router;