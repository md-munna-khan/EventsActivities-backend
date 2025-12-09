import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AdminService } from './admin.service';
import pick from '../../../shared/pick';
import { adminFilterableFields } from './admin.constant';

import httpStatus from 'http-status';
import { sendResponse } from '../../../shared/sendResponse';
import { catchAsync } from '../../../shared/catchAsync';
import prisma from '../../../shared/prisma';
import { hostsStatus, UserRole, UserStatus } from '@prisma/client';



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

// const getByIdFromDB = catchAsync(async (req: Request, res: Response) => {
//     const { id } = req.params;

//     const result = await AdminService.getByIdFromDB(id);
//     sendResponse(res, {
//         statusCode: httpStatus.OK,
//         success: true,
//         message: "Admin data fetched by id!",
//         data: result
//     });
// })


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

const fetchPendingEventApplications = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getPendingEvents();
  sendResponse(res, { 
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pending event applications fetched',
    data: result
  });
}
);

 const approveEventController = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params;
  const updatedEvent = await AdminService.approveEvent(eventId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event approved successfully",
    data: updatedEvent,
  });
});

 const rejectEventController = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params;
  const updatedEvent = await AdminService.rejectEvent(eventId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event rejected successfully",
    data: updatedEvent,
  });
});





// Approve host application (transactional):
 const HostApprove = catchAsync(async (req: Request, res: Response) => {
  const { applicationId } = req.params; // use application id in route
  // load application + user
  const application = await prisma.hostApplication.findUniqueOrThrow({
    where: { id: applicationId },
  });
console.log(application)
  const result = await prisma.$transaction(async (tx) => {
    // fetch user
    const userData = await tx.user.findUniqueOrThrow({ where: { id: application.userId } });

    // create Host record
    const host = await tx.host.create({
      data: {
        email: userData.email,
        name: application.name ?? userData.email.split('@')[0],
        profilePhoto: '',
        contactNumber: '',
        bio: '',
        location: '',
        status: hostsStatus.APPROVED,
      },
    });

    // remove Client profile if exists (prevent double profiles)
    const client = await tx.client.findUnique({ where: { email: userData.email } });
    if (client) {
      await tx.client.delete({ where: { id: client.id } });
    }

    // update user role -> HOST and reactivate user
    await tx.user.update({
      where: { id: userData.id },
      data: { role: UserRole.HOST, status: UserStatus.ACTIVE },
    });

    // mark application approved
    const updatedApp = await tx.hostApplication.update({
      where: { id: applicationId },
      data: { status: 'APPROVED' },
    });

    return { host, updatedApp };
  });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Host application approved and host created',
    data: result,
  });
});

// Reject host application (transactional):
 const HostReject = catchAsync(async (req: Request, res: Response) => {
  const { applicationId } = req.params;

  const application = await prisma.hostApplication.findUniqueOrThrow({
    where: { id: applicationId },
  });

  const result = await prisma.$transaction(async (tx) => {
    // set application status rejected
    const updatedApp = await tx.hostApplication.update({
      where: { id: applicationId },
      data: { status: 'REJECTED' },
    });

    // restore user status to ACTIVE so they can login again
    await tx.user.update({
      where: { id: application.userId },
      data: { status: UserStatus.ACTIVE },
    });

    return updatedApp;
  });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Host application rejected',
    data: result,
  });
});

// fetch pending host applications
const fetchPendingHostApplications = catchAsync(async (req: Request, res: Response) => {
  const pending = await prisma.hostApplication.findMany({ where: { status: 'PENDING' } });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pending host applications fetched',
    data: pending,
  });
});

// ==================== HOST MANAGEMENT ====================
const getAllHosts = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['searchTerm', 'status']);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await AdminService.getAllHosts(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Hosts fetched successfully',
    meta: result.meta,
    data: result.data
  });
});

const updateHostStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await AdminService.updateHostStatus(id, status);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Host status updated successfully',
    data: result
  });
});

const deleteHost = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.deleteHost(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Host deleted successfully',
    data: result
  });
});

export const AdminController = {
    getAllFromDB,
    updateIntoDB,
    deleteFromDB,
    HostApprove,
    HostReject,
    fetchPendingHostApplications,
    approveEventController,
    rejectEventController,
    fetchPendingEventApplications,
    // Host Management
    getAllHosts,
    updateHostStatus,
    deleteHost
}