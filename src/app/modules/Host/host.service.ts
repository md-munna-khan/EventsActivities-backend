
import { uploadBufferToCloudinary, cloudinaryUpload } from "../../../config/cloudinary.config";
import { EventCategory, EventStatus, Prisma } from "@prisma/client";
import prisma from "../../../shared/prisma";
import { jwtHelper } from "../../../helpers/jwtHelper";
import config from "../../../config";
import { Secret } from "jsonwebtoken";
import { QueryOptions } from "../../interfaces/common";


import { Request } from "express";
import { get } from "http";
const EVENT_CATEGORIES = Object.values(EventCategory) as string[];
const EVENT_STATUSES = Object.values(EventStatus) as string[];

const createEvent = async (req:any,user:any)=> {

       const accessToken = user.accessToken;
        
      const decodedData = jwtHelper.verifyToken(accessToken, config.jwt.jwt_secret as Secret);
      
    const payload = req.body as any;
   
        const file = req.file;
    
    
        let uploadedPublicId: string | undefined;
        if (file) {
          if ((file as any).buffer) {
            const uploaded = await uploadBufferToCloudinary((file as any).buffer, (file as any).originalname || 'event');
            req.body.image = uploaded?.secure_url;
            uploadedPublicId = (uploaded as any)?.public_id;
          } else if ((file as any).path) {
            const uploaded = await cloudinaryUpload.uploader.upload((file as any).path, { resource_type: 'auto' });
            req.body.image = uploaded?.secure_url;
            uploadedPublicId = (uploaded as any)?.public_id;
          }
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
    payload.date = new Date(payload.date);
    if (payload.joiningFee !== undefined) payload.joiningFee = Number(payload.joiningFee);
    if (payload.capacity !== undefined) payload.capacity = Number(payload.capacity);
  
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

// const getEvents = async (options: QueryOptions = {}) => {
//   const filter = options.filter ?? {};
//   const pagination = options.pagination ?? { page: 1, limit: 10 };

//   const where: any = {};

//   // build where from filter (category, status, fromDate, toDate, search)
//   if (filter.category) where.category = filter.category;
//   if (filter.status) where.status = filter.status;
//   if (filter.search) {
//     where.OR = [
//       { title: { contains: filter.search, mode: "insensitive" } },
//       { description: { contains: filter.search, mode: "insensitive" } },
//       { location: { contains: filter.search, mode: "insensitive" } },
//     ];
//   }
//   if (filter.fromDate || filter.toDate) {
//     where.date = {};
//     if (filter.fromDate) where.date.gte = new Date(filter.fromDate);
//     if (filter.toDate) where.date.lte = new Date(filter.toDate);
//   }

//   const page = Math.max(1, Number(pagination.page) || 1);
//   const limit = Math.max(1, Number(pagination.limit) || 10);
//   const skip = (page - 1) * limit;

//   const [total, events] = await Promise.all([
//     prisma.event.count({ where }),
//     prisma.event.findMany({
//       where,
//       skip,
//       take: limit,
//       orderBy: { date: "asc" },
//       include: {
//         host: { select: { id: true, name: true, email: true, profilePhoto: true, rating: true } },
//         participants: true, // can be used to get count
//       },
//     }),
//   ]);

//   // map to include participantCount
//   const data = events.map((e) => ({
//     ...e,
//     participantCount: e.participants?.length ?? 0,
//   }));

//   return {
//     meta: { page, limit, total, pages: Math.ceil(total / limit) },
//     data,
//   };
// };

const getMyEvents = async (hostEmail: string) => {

  const host = await prisma.host.findFirst({ where: { email: hostEmail } });
  if (!host) throw new Error("Host profile not found");

  const events = await prisma.event.findMany({
    where: { hostId: String(host.id) },
    orderBy: { date: "asc" },
    include: {
      participants: true,
      host: { select: { id: true, name: true, email: true, profilePhoto: true, rating: true } },
    },
  });

  const data = events.map((e) => ({
    ...e,
    participantCount: e.participants?.length ?? 0,
  }));

  return data;
};



const getEvents = async (options: QueryOptions = {}) => {
  const filter = options.filter ?? {};
  const pagination = options.pagination ?? { page: 1, limit: 10 };

  const where: any = {};

  if (filter.category) {
    const normalized = String(filter.category)
      .trim()
      .replace(/[\s-]+/g, "_")
      .replace(/[^A-Za-z0-9_]/g, "")
      .toUpperCase();

    const aliasMap: Record<string, string> = { ONLINE: "ONLINE_EVENT", "BOARD GAME": "BOARDGAME" };
    const mapped = aliasMap[normalized] ?? normalized;

    if (!EVENT_CATEGORIES.includes(mapped)) {
      throw new Error(`Invalid category '${filter.category}'. Allowed: ${EVENT_CATEGORIES.join(", ")}`);
    }
    where.category = mapped;
  }

  if (filter.status) {
    const normalized = String(filter.status)
      .trim()
      .replace(/[\s-]+/g, "_")
      .replace(/[^A-Za-z0-9_]/g, "")
      .toUpperCase();

    if (!EVENT_STATUSES.includes(normalized)) {
      throw new Error(`Invalid status '${filter.status}'. Allowed: ${EVENT_STATUSES.join(", ")}`);
    }
    where.status = normalized;
  }

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
        participants: true,
      },
    }),
  ]);

  const data = events.map((e) => ({ ...e, participantCount: e.participants?.length ?? 0 }));

  return { meta: { page, limit, total, pages: Math.ceil(total / limit) }, data };
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
  let uploadedPublicId: string | undefined;
  if (file) {
    if ((file as any).buffer) {
      const uploaded = await uploadBufferToCloudinary((file as any).buffer, (file as any).originalname || 'event');
      if (uploaded?.secure_url) payload.image = uploaded.secure_url;
      uploadedPublicId = (uploaded as any)?.public_id;
    } else if ((file as any).path) {
      const uploaded = await cloudinaryUpload.uploader.upload((file as any).path, { resource_type: 'auto' });
      if (uploaded?.secure_url) payload.image = uploaded.secure_url;
      uploadedPublicId = (uploaded as any)?.public_id;
    }
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


const getAllHosts = async () => {
  const hosts = await prisma.host.findMany({
    select: { id: true, name: true, email: true, profilePhoto: true, rating: true, bio: true },
  });
  return hosts;
}
 
const updateEventStatus = async (id: string, status: EventStatus, req?: Request) => {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new Error("Event not found");  
  // ownership check  
  if (!req) throw new Error("Request required for authorization");  
  const requester = (req as any).user;
  if (!requester) throw new Error("Unauthorized: missing user info");

  const host = await prisma.host.findFirst({ where: { email: requester.email } });
  if (!host) throw new Error("Unauthorized: host profile not found for your account");  
  if (String(host.id) !== String(existing.hostId)) {  
    throw new Error("Unauthorized to update this event");  
  }
  const normalized = String(status)
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "")
    .toUpperCase(); 
  if (!EVENT_STATUSES.includes(normalized)) {
    throw new Error(`Invalid status '${status}'. Allowed: ${EVENT_STATUSES.join(", ")}`);
  } 
  const updated = await prisma.event.update({
    where: { id },
    data: { status: normalized as EventStatus },
  }); 
  return updated;
};

 export const hostService = {
  createEvent,
  getEvents,
  getSingleEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  getAllHosts
  ,updateEventStatus
 
};