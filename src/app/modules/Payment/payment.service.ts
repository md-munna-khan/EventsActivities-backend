// import prisma from "../../../shared/prisma";
// import { PaymentStatus, ParticipantStatus, EventStatus } from "@prisma/client";

// const _normalizeTran = (query: Record<string, string>) => {
//   return (query.transactionId ?? query.tranId ?? query.tran_id ?? query.transaction_id) as string;
// };

// const successPayment = async (query: Record<string, string>) => {
//   const tranId = _normalizeTran(query);
//   console.log("Processing success payment for transaction ID:", tranId);
//   if (!tranId) throw new Error("transaction id is required");

//   return await prisma.$transaction(async (tx) => {
//     const payment = await tx.payment.findUnique({ where: { tranId } });
//     if (!payment) throw new Error("Payment not found");

//     // update payment to PAID
//     const updatedPayment = await tx.payment.update({
//       where: { id: payment.id },
//       data: { status: PaymentStatus.PAID },
//     });

//     // find participant and set CONFIRMED
//     const participant = await tx.eventParticipant.findFirst({ where: { paymentId: payment.id } });
//     if (!participant) throw new Error("Participant not found for this payment");

//     await tx.eventParticipant.update({
//       where: { id: participant.id },
//       data: { participantStatus: ParticipantStatus.CONFIRMED },
//     });

//     // distribute income: 90% host, 10% admin
//     const adminShare = Number(payment.amount) * 0.1;
//     const hostShare = Number(payment.amount) * 0.9;

//     // increment host income
//     await tx.host.update({
//       where: { id: payment.hostId },
//       data: { income: { increment: hostShare } },
//     });

//     // pick an admin (first non-deleted) and increment income if exists
//     const admin = await tx.admin.findFirst({ where: { isDeleted: false } });
//     if (admin) {
//       await tx.admin.update({
//         where: { id: admin.id },
//         data: { income: { increment: adminShare } },
//       });
//     }

//     return { message: "Payment successful and processed.", payment: updatedPayment, participantId: participant.id };
//   });
// };

// const _failOrCancel = async (query: Record<string, string>, reason: "FAILED" | "CANCELLED") => {
//   const tranId = _normalizeTran(query);
//   if (!tranId) throw new Error("transaction id is required");

//   return await prisma.$transaction(async (tx) => {
//     const payment = await tx.payment.findUnique({ where: { tranId } });
//     console.log("Processing fail/cancel payment for transaction ID:", tranId);

//     if (!payment) throw new Error("Payment not found");

//     const participant = await tx.eventParticipant.findFirst({ where: { paymentId: payment.id } });
//     if (!participant) throw new Error("Participant not found for this payment");

//     // set participant LEFT
//     await tx.eventParticipant.update({
//       where: { id: participant.id },
//       data: { participantStatus: ParticipantStatus.LEFT },
//     });

//     // delete the payment record
//     await tx.payment.delete({ where: { id: payment.id } });

//     // restore event capacity and status if needed
//     const event = await tx.event.findUnique({ where: { id: payment.eventId } });
//     if (event) {
//       const restoredCapacity = event.capacity + 1;
//       const newStatus = event.status === EventStatus.FULL ? EventStatus.OPEN : event.status;
//       await tx.event.update({
//         where: { id: event.id },
//         data: { capacity: restoredCapacity, status: newStatus },
//       });
//     }

//     return { message: reason === "CANCELLED" ? "Payment cancelled" : "Payment failed" };
//   });
// };

// const failPayment = async (query: Record<string, string>) => {
//   return _failOrCancel(query, "FAILED");
// };

// const cancelPayment = async (query: Record<string, string>) => {
//   return _failOrCancel(query, "CANCELLED");
// };

// export const PaymentService = {
//   successPayment,
//   failPayment,
//   cancelPayment,
// };



// src/app/modules/Payment/payment.service.ts
import prisma from "../../../shared/prisma";
import { PaymentStatus, ParticipantStatus, EventStatus } from "@prisma/client";

const _normalizeTran = (payload: Record<string, any> = {}) => {
  // catch all common keys that gateways send
  return (
    payload.transactionId ||
    payload.tranId ||
    payload.tran_id ||
    payload.transaction_id ||
    payload.tran_id_sslcommerz || // in case
    null
  );
};

const successPayment = async (payload: Record<string, any>) => {
  const tranId = _normalizeTran(payload);
  console.log(tranId)
  if (!tranId) {
    // don't throw raw — return info so controller can handle redirect
    return { ok: false, message: "transaction id missing", tranId: null, debug: payload };
  }

  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { tranId } });
    if (!payment) {
      return { ok: false, message: "Payment record not found", tranId, debug: payload };
    }

    // update payment to PAID
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.PAID },
    });

    // find participant and set CONFIRMED
    const participant = await tx.eventParticipant.findFirst({ where: { paymentId: payment.id } });
    if (!participant) {
      return { ok: false, message: "Participant not found for this payment", tranId, paymentId: payment.id };
    }

    await tx.eventParticipant.update({
      where: { id: participant.id },
      data: { participantStatus: ParticipantStatus.CONFIRMED },
    });

    // distribute income safely (guard nulls)
    const amount = Number(payment.amount) || 0;
    const adminShare = amount * 0.1;
    const hostShare = amount * 0.9;

    if (payment.hostId) {
      await tx.host.update({
        where: { id: payment.hostId },
        data: { income: { increment: hostShare } },
      });
    }

    const admin = await tx.admin.findFirst({ where: { isDeleted: false } });
    if (admin) {
      await tx.admin.update({
        where: { id: admin.id },
        data: { income: { increment: adminShare } },
      });
    }

    return { ok: true, message: "Payment successful and processed.", payment: updatedPayment, participantId: participant.id, tranId };
  });
};

const _failOrCancel = async (payload: Record<string, any>, reason: "FAILED" | "CANCELLED") => {
  const tranId = _normalizeTran(payload);
  if (!tranId) {
    return { ok: false, message: "transaction id missing", tranId: null, debug: payload };
  }

  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { tranId } });
    if (!payment) {
      return { ok: false, message: "Payment not found", tranId };
    }

    const participant = await tx.eventParticipant.findFirst({ where: { paymentId: payment.id } });
    if (!participant) {
      // maybe payment created but participant not linked — handle gracefully
      await tx.payment.delete({ where: { id: payment.id } });
      return { ok: false, message: "Participant not found; payment removed", tranId };
    }

    // set participant LEFT
    await tx.eventParticipant.update({
      where: { id: participant.id },
      data: { participantStatus: ParticipantStatus.LEFT },
    });

    // delete the payment record
    await tx.payment.delete({ where: { id: payment.id } });

    // restore event capacity and status if needed
    const event = await tx.event.findUnique({ where: { id: payment.eventId } });
    if (event) {
      const restoredCapacity = event.capacity + 1;
      const newStatus = event.status === EventStatus.FULL ? EventStatus.OPEN : event.status;
      await tx.event.update({
        where: { id: event.id },
        data: { capacity: restoredCapacity, status: newStatus },
      });
    }

    return { ok: true, message: reason === "CANCELLED" ? "Payment cancelled" : "Payment failed", tranId };
  });
};

const failPayment = async (payload: Record<string, any>) => _failOrCancel(payload, "FAILED");
const cancelPayment = async (payload: Record<string, any>) => _failOrCancel(payload, "CANCELLED");

const listAllPayments = async () => {
  return await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
  });
};

export const PaymentService = {
  successPayment,
  failPayment,
  cancelPayment,
  listAllPayments
};
