import { z } from "zod";
import { EventCategory, EventStatus } from "@prisma/client";

// Create Event Validation Schema
export const createHostValidation = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  category: z.nativeEnum(EventCategory, {
    message: "Invalid event category",
  }),
  description: z.string().min(10, "Description must be at least 10 characters"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  location: z.string().min(2, "Location is required"),
  joiningFee: z.number().nonnegative("Joining fee must be 0 or more"),

  capacity: z.number().int().positive("Capacity must be a positive number"),

  // status is optional because Prisma sets default PENDING
  status: z.nativeEnum(EventStatus).optional(),


});

// Update Event Validation Schema
export const updateHostValidation = z.object({
 
    title: z.string().min(2).optional(),
    category: z.nativeEnum(EventCategory).optional(),
    description: z.string().min(10).optional(),
    date: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format",
      })
      .optional(),
    location: z.string().optional(),
    joiningFee: z.number().nonnegative().optional(),
   
    capacity: z.number().int().positive().optional(),
    status: z.nativeEnum(EventStatus).optional(),

});
export const eventValidation = {
 createHostValidation,
 updateHostValidation,

};
