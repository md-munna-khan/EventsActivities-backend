


import prisma from "../../../shared/prisma";
import { jwtHelper } from "../../../helpers/jwtHelper";
import config from "../../../config";
import { Secret } from "jsonwebtoken";



import { Request } from "express";

/**
 * Participant operations: join / leave
 *
 * joinEvent: checks capacity and duplicate join, then creates EventParticipant
 */
const joinEvent = async (eventId: string, user: any) => {
    const accessToken = user.accessToken;
        
      const decodedData = jwtHelper.verifyToken(accessToken, config.jwt.jwt_secret as Secret);
    // find Client linked to this user
  const client = await prisma.client.findUnique({
    where: { email: decodedData.email },
  });
  if (!client) throw new Error("Unauthorized: Client profile not found");

  const clientId = client.id;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { participants: true }
  });
  if(event?.status !== 'OPEN' && event?.status ==='REJECTED' ) throw new Error("Cannot join inactive event");
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

const leaveEvent = async (eventId: string, user: any) => {
    const clientId = user.id;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { participants: true },
   
  });
  const existing = await prisma.eventParticipant.findFirst({
    where: { eventId, clientId },
  });
  if (!existing) throw new Error("You are not joined to this event");

  await prisma.eventParticipant.delete({ where: { id: existing.id } });
  return { id: existing.id };
};

export const eventsService = {

  joinEvent,
  leaveEvent,
};