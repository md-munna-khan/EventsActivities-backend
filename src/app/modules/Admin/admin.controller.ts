import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AdminService } from './admin.service';
import pick from '../../../shared/pick';
import { adminFilterableFields } from './admin.constant';

import httpStatus from 'http-status';
import { sendResponse } from '../../../shared/sendResponse';
import { catchAsync } from '../../../shared/catchAsync';
import prisma from '../../../shared/prisma';
import { hostsStatus, UserRole } from '@prisma/client';



const getAllFromDB: RequestHandler = catchAsync(async (req: Request, res: Response) => {
    const filters = pick(req.query, adminFilterableFields);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder'])
    const result = await AdminService.getAllFromDB(filters, options)

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Admin data fetched!",
        meta: result.meta,
        data: result.data
    })
})

const getByIdFromDB = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await AdminService.getByIdFromDB(id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Admin data fetched by id!",
        data: result
    });
})


const updateIntoDB = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await AdminService.updateIntoDB(id, req.body);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Admin data updated!",
        data: result
    })
})

const deleteFromDB = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await AdminService.deleteFromDB(id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Admin data deleted!",
        data: result
    })
})

const HostApprove = catchAsync(async (req: Request, res: Response) => {
  const { hostId } = req.params;

  const host = await prisma.host.findUniqueOrThrow({ where: { id: hostId } });

  // update host status
  const updatedHost = await prisma.host.update({
    where: { id: hostId },
    data: { status: hostsStatus.APPROVED }
  });

  // update related user role to HOST (relation via email)
  await prisma.user.update({
    where: { email: host.email },
    data: { role: UserRole.HOST }
  });

  // optionally: send notification/email to host

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Host approved',
    data: updatedHost
  });
});

const HostReject = catchAsync(async (req: Request, res: Response) => {
  const { hostId } = req.params;
 

  const host = await prisma.host.findUniqueOrThrow({ where: { id: hostId } });

  const updatedHost = await prisma.host.update({
    where: { id: hostId },
    data: { status: hostsStatus.REJECTED }
  });
  // update related user role to HOST (relation via email)
  await prisma.user.update({
    where: { email: host.email },
    data: { role: UserRole.HOST }
  });

  // optionally: store reason in audit log or notify user via email

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Host rejected',
    data: updatedHost
  });
});
 const fetchPendingEvents = catchAsync(async (req: Request, res: Response) => {
  const events = await AdminService.getPendingEvents();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Pending events fetched successfully",
    data: events,
  });
});
export const approveEventController = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params;
  const updatedEvent = await AdminService.approveEvent(eventId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event approved successfully",
    data: updatedEvent,
  });
});

export const rejectEventController = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params;
  const updatedEvent = await AdminService.rejectEvent(eventId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event rejected successfully",
    data: updatedEvent,
  });
});
export const AdminController = {
    getAllFromDB,
    getByIdFromDB,
    updateIntoDB,
    deleteFromDB,
    HostApprove,
    HostReject,
    fetchPendingEvents,
    approveEventController,
    rejectEventController
}