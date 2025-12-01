
import { homedir } from "os";
import { fileUploader } from "../../../helpers/fileUploader";
import prisma from "../../../shared/prisma";
import { jwtHelper } from "../../../helpers/jwtHelper";
import config from "../../../config";
import { Secret } from "jsonwebtoken";








const createEvent = async (req:any,user:any)=> {

       const accessToken = user.accessToken;
        
      const decodedData = jwtHelper.verifyToken(accessToken, config.jwt.jwt_secret as Secret);
      
    const payload = req.body as any;
   
        const file = req.file;
    
    
        if (file) {
        const uploadToCloudinary = await fileUploader.uploadToCloudinary(file);
        req.body.image = uploadToCloudinary?.secure_url;
    }

    
      // convert date & numeric fields
  // if (payload.date) payload.date = new Date(payload.date);
  // if (payload.joiningFee !== undefined) payload.joiningFee = Number(payload.joiningFee);
  // if (payload.capacity !== undefined) payload.capacity = Number(payload.capacity);
 const dbUser = await prisma.user.findUnique({
        where: { id: decodedData.userId }
    });

    if (!dbUser) throw new Error("User not found");

   
    const host = await prisma.host.findUnique({
        where: { email: dbUser.email }
    });

    if (!host) throw new Error("Host profile not found");
 
  
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
      hostId: host.id,
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
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new Error("Event not found");

  // If you want only host can update: compare req.user.id === existing.hostId
  if ((req as any)?.user && (req as any).user.id !== existing.hostId) {
    // allow admin? skip if admin
    const role = (req as any).user?.role;
    if (role !== "ADMIN") throw new Error("Unauthorized to update this event");
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
  if ((req as any)?.user && (req as any).user.id !== existing.hostId) {
    const role = (req as any).user?.role;
    if (role !== "ADMIN") throw new Error("Unauthorized to delete this event");
  }

  // remove participants first (or cascade configured)
  await prisma.$transaction([
    prisma.eventParticipant.deleteMany({ where: { eventId: id } }),
    prisma.event.delete({ where: { id } }),
  ]);

  return { id };
};

/**
 * Participant operations: join / leave
 *
 * joinEvent: checks capacity and duplicate join, then creates EventParticipant
 */
const joinEvent = async (eventId: string, clientId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { participants: true },
  });
  if (!event) throw new Error("Event not found");

  // check capacity
  const currentCount = event.participants.length;
  if (event.capacity <= currentCount) throw new Error("Event is full");

  // check duplicate
  const already = await prisma.eventParticipant.findFirst({
    where: { eventId, clientId },
  });
  if (already) throw new Error("You have already joined this event");

  const participant = await prisma.eventParticipant.create({
    data: { eventId, clientId },
  });

  return participant;
};

const leaveEvent = async (eventId: string, clientId: string) => {
  const existing = await prisma.eventParticipant.findFirst({
    where: { eventId, clientId },
  });
  if (!existing) throw new Error("You are not joined to this event");

  await prisma.eventParticipant.delete({ where: { id: existing.id } });
  return { id: existing.id };
};

export default {
  createEvent,
  getEvents,
  getSingleEvent,
  updateEvent,
  deleteEvent,
  joinEvent,
  leaveEvent,
};