

import { fileUploader } from "../../../helpers/fileUploader";
import prisma from "../../../shared/prisma";
import { jwtHelper } from "../../../helpers/jwtHelper";
import config from "../../../config";
import { Secret } from "jsonwebtoken";
import { QueryOptions } from "../../interfaces/common";


import { Request } from "express";

const createEvent = async (req:any,user:any)=> {

       const accessToken = user.accessToken;
        
      const decodedData = jwtHelper.verifyToken(accessToken, config.jwt.jwt_secret as Secret);
      
    const payload = req.body as any;
   
        const file = req.file;
    
    
        if (file) {
        const uploadToCloudinary = await fileUploader.uploadToCloudinary(file);
        req.body.image = uploadToCloudinary?.secure_url;
    }


 const dbUser = await prisma.user.findUnique({
        where: { id: decodedData.userId }
    });

    if (!dbUser) throw new Error("User not found");

   
    // const host = await prisma.host.findUnique({
    //     where: { email: dbUser.email }
    // });

   let host = await prisma.host.findFirst({
  where: { email: dbUser.email }
});

if (!host) {

  throw new Error("Host profile not found for email: " + dbUser.email);
}
 const hostId = String (host.id);

     // convert date string to Date object
    // payload.date = new Date(payload.date);
    // if (payload.joiningFee !== undefined) payload.joiningFee = Number(payload.joiningFee);
    // if (payload.capacity !== undefined) payload.capacity = Number(payload.capacity);
  
 const event = await prisma.event.create({
    data: {
      title: payload.title,
      category: payload.category,
      description: payload.description,
      date: payload.date,
      location: payload.location,
      joiningFee: payload.joiningFee ?? 0,
      image: payload.image ?? "",
      capacity: payload.capacity,
      hostId: hostId,
      status: payload.status, // optional
    },
   
  });

  return event;

};

const getEvents = async (options: QueryOptions = {}) => {
  const filter = options.filter ?? {};
  const pagination = options.pagination ?? { page: 1, limit: 10 };

  const where: any = {};

  // build where from filter (category, status, fromDate, toDate, search)
  if (filter.category) where.category = filter.category;
  if (filter.status) where.status = filter.status;
  if (filter.search) {
    where.OR = [
      { title: { contains: filter.search, mode: "insensitive" } },
      { description: { contains: filter.search, mode: "insensitive" } },
      { location: { contains: filter.search, mode: "insensitive" } },
    ];
  }
  if (filter.fromDate || filter.toDate) {
    where.date = {};
    if (filter.fromDate) where.date.gte = new Date(filter.fromDate);
    if (filter.toDate) where.date.lte = new Date(filter.toDate);
  }

  const page = Math.max(1, Number(pagination.page) || 1);
  const limit = Math.max(1, Number(pagination.limit) || 10);
  const skip = (page - 1) * limit;

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: "asc" },
      include: {
        host: { select: { id: true, name: true, email: true, profilePhoto: true, rating: true } },
        participants: true, // can be used to get count
      },
    }),
  ]);

  // map to include participantCount
  const data = events.map((e) => ({
    ...e,
    participantCount: e.participants?.length ?? 0,
  }));

  return {
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
    data,
  };
};

const getSingleEvent = async (id: string) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, name: true, email: true, profilePhoto: true, rating: true } },
      participants: { include: { client: { select: { id: true, name: true, email: true, profilePhoto: true } } } },
      reviews: true,
    },
  });

  if (!event) throw new Error("Event not found");
  return {
    ...event,
    participantCount: event.participants?.length ?? 0,
  };
};

const updateEvent = async (id: string, payload: any, req?: Request) => {
  // optional: check host ownership before update (recommended)
  const existing = await prisma.event.findUnique({ where: { id },
  include: { host: true } });

  if (!existing) throw new Error("Event not found");

 // 2) require auth info
  if (!req) throw new Error("Request required for authorization");
  const requester = (req as any).user;
  if (!requester) throw new Error("Unauthorized: missing user info");

  // 3) admin can update anything
  if (requester.role === "ADMIN") {
    // continue to update below
  } else {
    // 4) non-admin: find host record for this requester by email
    const host = await prisma.host.findFirst({ where: { email: requester.email } });
    if (!host) throw new Error("Unauthorized: host profile not found for your account");

    // 5) check ownership: host.id must match event.hostId
    if (String(host.id) !== String(existing.hostId)) {
      throw new Error("Unauthorized to update this event");
    }
  }

  // handle file if new upload provided
  const file = (req as any)?.file;
  if (file) {
    const res = await fileUploader.uploadToCloudinary(file);
    if (res?.secure_url) payload.image = res.secure_url;
  }

  if (payload.date) payload.date = new Date(payload.date);
  if (payload.joiningFee !== undefined) payload.joiningFee = Number(payload.joiningFee);
  if (payload.capacity !== undefined) payload.capacity = Number(payload.capacity);

  const updated = await prisma.event.update({
    where: { id },
    data: payload,
  });

  return updated;
};

const deleteEvent = async (id: string, req?: Request) => {
  // optional: ownership check
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new Error("Event not found");
  
  if (!existing) throw new Error("Event not found");

 // 2) require auth info
  if (!req) throw new Error("Request required for authorization");
  const requester = (req as any).user;
  if (!requester) throw new Error("Unauthorized: missing user info");

  // 3) admin can update anything
  if (requester.role === "ADMIN") {
    // continue to update below
  } else {
    // 4) non-admin: find host record for this requester by email
    const host = await prisma.host.findFirst({ where: { email: requester.email } });
    if (!host) throw new Error("Unauthorized: host profile not found for your account");

    // 5) check ownership: host.id must match event.hostId
    if (String(host.id) !== String(existing.hostId)) {
      throw new Error("Unauthorized to update this event");
    }
  }
  // remove participants first (or cascade configured)
  await prisma.$transaction([
    prisma.eventParticipant.deleteMany({ where: { eventId: id } }),
    prisma.event.delete({ where: { id } }),
  ]);

  return { id };
};





 export const hostService = {
  createEvent,
  getEvents,
  getSingleEvent,
  updateEvent,
  deleteEvent,
  
};