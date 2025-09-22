import { mutation } from './_generated/server';
import { normalizePhoneNumber } from '../lib/utils/phone';

/**
 * One-time migration: normalize user.phone values to canonical +91XXXXXXXXXX.
 * - Iterates all users
 * - If phone is 10 valid digits (6-9 start) without +91, patch to +91<digits>
 * - Skips invalid values and logs details
 * - Validates by_phone index lookups post-patch
 */
export const normalizeUserPhones = mutation({
  args: {},
  handler: async (ctx) => {
    let scanned = 0;
    let patched = 0;
    let skipped = 0;
    const details: Array<string> = [];

    // Scan all users
    const users = await ctx.db.query('users').collect();
    for (const u of users) {
      scanned++;
      const raw = (u as any).phone as string | undefined;
      if (!raw || typeof raw !== 'string') {
        skipped++;
        details.push(`skip: ${u._id} phone missing`);
        continue;
      }

      const s = raw.trim();
      // Already canonical
      if (/^\+91[6-9]\d{9}$/.test(s)) {
        continue;
      }
      // If 10 digits starting 6-9, patch to +91
      const digits = s.replace(/\D/g, '');
      if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
        const canonical = `+91${digits}`;
        await ctx.db.patch(u._id, { phone: canonical });
        patched++;
        details.push(`patch: ${u._id} ${s} -> ${canonical}`);
        // Validate index lookup
        const found = await ctx.db
          .query('users')
          .withIndex('by_phone', (q) => q.eq('phone', canonical))
          .unique();
        if (!found || found._id !== u._id) {
          details.push(
            `warn: index lookup mismatch for ${u._id} via ${canonical}`,
          );
        }
        continue;
      }

      // Try full normalization; if fails, skip with log
      try {
        const canonical = normalizePhoneNumber(s);
        if (canonical !== s) {
          await ctx.db.patch(u._id, { phone: canonical });
          patched++;
          details.push(`patch: ${u._id} ${s} -> ${canonical}`);
          const found = await ctx.db
            .query('users')
            .withIndex('by_phone', (q) => q.eq('phone', canonical))
            .unique();
          if (!found || found._id !== u._id) {
            details.push(
              `warn: index lookup mismatch for ${u._id} via ${canonical}`,
            );
          }
        }
      } catch (e: any) {
        skipped++;
        details.push(`skip: ${u._id} invalid '${s}' (${e?.message || e})`);
      }
    }

    const summary = { scanned, patched, skipped };
    console.info('[migrations.normalizeUserPhones] summary', summary);
    return { summary, details };
  },
});
