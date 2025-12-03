
import prisma from '../../../shared/prisma';
import { UserRole, PaymentStatus, EventStatus } from '@prisma/client';

/**
 * Fetch dashboard meta data based on user role.
 * Accepts a `user` object (as set by auth middleware) or a cookie object fallback.
 */
const fetchDashboardMetaData = async (user: any) => {
  // support both req.user (auth middleware) and req.cookies fallback
  const ctx = user?.user || user?.cookies || user;
  const role = (ctx && (ctx.role || ctx?.role)) as UserRole | string | undefined;

  // ADMIN dashboard
  if (role === UserRole.ADMIN || role === 'ADMIN') {
    const [totalUsers, totalClients, totalHosts, totalEvents, eventsByStatus, totalPaidPayments, revenueObj, pendingHostApplications, recentEvents] =
      await Promise.all([
        prisma.user.count(),
        prisma.client.count({ where: { isDeleted: false } }).catch(() => 0),
        prisma.host.count({ where: { isDeleted: false } }).catch(() => 0),
        prisma.event.count(),
        prisma.event.groupBy({ by: ['status'], _count: { _all: true } }).catch(() => []),
        prisma.payment.count({ where: { status: PaymentStatus.PAID } }).catch(() => 0),
        prisma.payment.aggregate({ _sum: { amount: true }, where: { status: PaymentStatus.PAID } }).catch(() => ({ _sum: { amount: 0 } })),
        // host applications pending (if model exists)
        prisma.hostApplication.count({ where: { status: 'PENDING' } }).catch(() => 0),
        prisma.event.findMany({ take: 10, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, status: true, createdAt: true, hostId: true } }).catch(() => []),
      ]);

    const eventsStatusCounts: Record<string, number> = {};
    (eventsByStatus || []).forEach((r: any) => {
      eventsStatusCounts[r.status] = r._count?._all ?? r._count ?? 0;
    });

    // classify success/failed roughly
    const successCount = eventsStatusCounts[EventStatus.COMPLETED] ?? 0;
    const failedCount = (eventsStatusCounts[EventStatus.CANCELLED] ?? 0) + (eventsStatusCounts[EventStatus.REJECTED] ?? 0);

    return {
      role: UserRole.ADMIN,
      totals: {
        users: totalUsers,
        clients: totalClients,
        hosts: totalHosts,
        events: totalEvents,
        paidPayments: totalPaidPayments,
        revenue: Number(revenueObj._sum?.amount ?? 0),
        pendingHostApplications,
      },
      eventsByStatus: eventsStatusCounts,
      successCount,
      failedCount,
      recentEvents,
    };
  }

  // HOST dashboard
  if (role === UserRole.HOST || role === 'HOST') {
    const email = ctx?.email as string | undefined;
    if (!email) throw new Error('User email not found in token');

    const host = await prisma.host.findFirst({ where: { email, isDeleted: false } });
    if (!host) throw new Error('Host profile not found');

    const [totalEvents, eventsByStatus, revenueObj, totalBookings, bookingsByStatus, recentEvents] = await Promise.all([
      prisma.event.count({ where: { hostId: host.id } }),
      prisma.event.groupBy({ by: ['status'], where: { hostId: host.id }, _count: { _all: true } }).catch(() => []),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { hostId: host.id, status: PaymentStatus.PAID } }).catch(() => ({ _sum: { amount: 0 } })),
      prisma.eventParticipant.count({ where: { event: { hostId: host.id } } }).catch(() => 0),
      prisma.eventParticipant.groupBy({ by: ['participantStatus'], where: { event: { hostId: host.id } }, _count: { _all: true } }).catch(() => []),
      prisma.event.findMany({ where: { hostId: host.id }, take: 10, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, status: true, createdAt: true, joiningFee: true, capacity: true, _count: { select: { participants: true } } } }).catch(() => []),
    ]);

    const eventsStatusCounts: Record<string, number> = {};
    (eventsByStatus || []).forEach((r: any) => (eventsStatusCounts[r.status] = r._count?._all ?? r._count ?? 0));

    const bookingsStatusCounts: Record<string, number> = {};
    (bookingsByStatus || []).forEach((r: any) => (bookingsStatusCounts[r.participantStatus] = r._count?._all ?? r._count ?? 0));

    return {
      role: UserRole.HOST,
      host: { id: host.id, name: host.name, email: host.email, income: host.income ?? 0 },
      totals: { events: totalEvents, bookings: totalBookings },
      eventsByStatus: eventsStatusCounts,
      bookingsByStatus: bookingsStatusCounts,
      totalRevenue: Number(revenueObj._sum?.amount ?? 0),
      recentEvents,
    };
  }

  // fallback public meta
  const users = await prisma.user.count();
  return { role: role ?? 'UNKNOWN', totals: { users } };
};

export const MetaService = {
  fetchDashboardMetaData,
};