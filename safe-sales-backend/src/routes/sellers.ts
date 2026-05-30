import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { nip19 } from 'nostr-tools';
import { prisma } from '../db/client.js';
import { BadRequest, Conflict, NotFound } from '../lib/errors.js';
import { nameEnquiry as mavapayNameEnquiry } from '../services/mavapay.js';

const CreateSellerSchema = z.object({
  npub: z.string().regex(/^npub1[0-9a-z]+$/, 'Must be a bech32 npub'),
  handle: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/, 'Lowercase letters, numbers, dot/dash/underscore'),
  name: z.string().min(2).max(80),
  location: z.string().min(2).max(80),
  phone: z.string().min(7).max(20),
  category: z.string().min(2).max(60),
  bio: z.string().max(500).optional(),
  bankName: z.string().max(80).optional(),
  bankAccount: z.string().max(20).optional(),
  bankHolder: z.string().max(80).optional(),
  bankCode: z.string().max(10).optional(),
  lnAddress: z.string().email('Must look like a Lightning address (user@domain)').optional(),
});

const sellersRoute: FastifyPluginAsync = async (app) => {
  // POST /api/sellers — create a seller from a Nostr identity
  app.post('/api/sellers', async (request) => {
    const body = CreateSellerSchema.parse(request.body);

    // Decode npub → hex pubkey (also validates it's a real bech32)
    let pubkey: string;
    try {
      const decoded = nip19.decode(body.npub);
      if (decoded.type !== 'npub') {
        throw new BadRequest('npub must decode to a public key, not ' + decoded.type);
      }
      pubkey = decoded.data;
    } catch (err) {
      if (err instanceof BadRequest) throw err;
      throw new BadRequest('Invalid npub: bech32 decode failed');
    }

    // Check uniqueness explicitly to return clean 409s (Prisma's unique-violation
    // exception would otherwise leak schema details).
    const [existingHandle, existingNpub] = await Promise.all([
      prisma.seller.findUnique({ where: { handle: body.handle.toLowerCase() } }),
      prisma.seller.findUnique({ where: { npub: body.npub } }),
    ]);
    if (existingHandle) throw new Conflict(`Handle "@${body.handle}" is already taken`);
    if (existingNpub) throw new Conflict('A seller with this Nostr identity already exists');

    let bankVerifiedName: string | null = null;
    if (body.bankName && body.bankAccount && body.bankHolder) {
      try {
        const result = await mavapayNameEnquiry({
          bankCode: body.bankCode ?? body.bankName,
          accountNumber: body.bankAccount,
        });
        bankVerifiedName = result.accountName;
      } catch (err) {
        throw new BadRequest(
          `Bank account verification failed: ${err instanceof Error ? err.message : 'Name Enquiry unavailable'}`,
        );
      }
    }

    const seller = await prisma.seller.create({
      data: {
        npub: body.npub,
        pubkey,
        handle: body.handle.toLowerCase(),
        name: body.name,
        location: body.location,
        phone: body.phone,
        category: body.category,
        bio: body.bio,
        bankName: body.bankName,
        bankAccount: body.bankAccount,
        bankHolder: body.bankHolder,
        bankCode: body.bankCode,
        bankVerifiedName,
        bankVerifiedAt: bankVerifiedName ? new Date() : null,
        lnAddress: body.lnAddress,
      },
    });

    return { seller };
  });

  // GET /api/sellers/:handle — public storefront data
  app.get<{ Params: { handle: string } }>('/api/sellers/:handle', async (request) => {
    const handle = request.params.handle.toLowerCase();

    const seller = await prisma.seller.findUnique({
      where: { handle },
      include: {
        listings: {
          where: { active: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!seller) throw new NotFound(`Seller @${handle} not found`);

    // Reputation = count of completed orders. Rating placeholder until
    // we wire NIP-32 review aggregation in Phase 6.
    const completedTrades = await prisma.order.count({
      where: { sellerId: seller.id, status: 'completed' },
    });

    return {
      seller,
      listings: seller.listings,
      reputation: {
        completedTrades,
        rating: null as number | null,
      },
    };
  });

  // PATCH /api/sellers/:id/payout — update payout preference
  const UpdatePayoutSchema = z.object({
    bankName: z.string().min(2).max(80).optional(),
    bankAccount: z.string().min(10).max(12).optional(),
    bankHolder: z.string().min(2).max(80).optional(),
    bankCode: z.string().max(10).optional(),
    lnAddress: z.string().email().optional(),
  }).refine(
    (v) => v.bankName || v.lnAddress,
    'Provide either bank details or a Lightning address',
  );

  app.patch<{ Params: { id: string } }>(
    '/api/sellers/:id/payout',
    async (request) => {
      const body = UpdatePayoutSchema.parse(request.body);
      const seller = await prisma.seller.findUnique({ where: { id: request.params.id } });
      if (!seller) throw new NotFound('Seller not found');

      let bankVerifiedName: string | null = seller.bankVerifiedName;
      let bankVerifiedAt: Date | null = seller.bankVerifiedAt;

      if (body.bankName && body.bankAccount && body.bankHolder) {
        try {
          const result = await mavapayNameEnquiry({
            bankCode: body.bankCode ?? body.bankName,
            accountNumber: body.bankAccount,
          });
          bankVerifiedName = result.accountName;
          bankVerifiedAt = new Date();
        } catch (err) {
          throw new BadRequest(
            `Bank account verification failed: ${err instanceof Error ? err.message : 'Name Enquiry unavailable'}`,
          );
        }
      }

      const updated = await prisma.seller.update({
        where: { id: seller.id },
        data: {
          bankName: body.bankName ?? seller.bankName,
          bankAccount: body.bankAccount ?? seller.bankAccount,
          bankHolder: body.bankHolder ?? seller.bankHolder,
          bankCode: body.bankCode ?? seller.bankCode ?? null,
          bankVerifiedName,
          bankVerifiedAt,
          lnAddress: body.lnAddress ?? seller.lnAddress,
        },
      });

      return { seller: updated };
    },
  );
};

export default sellersRoute;
