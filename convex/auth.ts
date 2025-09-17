import { action, mutation, query } from './_generated/server';
import { api } from './_generated/api';
import { v } from 'convex/values';
import bcrypt from 'bcryptjs';

// Helpers compatible with Convex runtime (no Node Buffer)
const base64Encode = (str: string) => {
  const bytes = new TextEncoder().encode(str);
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : NaN;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : NaN;
    const triplet =
      (b1 << 16) |
      ((isNaN(b2 as any) ? 0 : (b2 as number)) << 8) |
      (isNaN(b3 as any) ? 0 : (b3 as number));
    const enc1 = (triplet >> 18) & 0x3f;
    const enc2 = (triplet >> 12) & 0x3f;
    const enc3 = (triplet >> 6) & 0x3f;
    const enc4 = triplet & 0x3f;
    if (isNaN(b2 as any)) {
      output += chars[enc1] + chars[enc2] + '==';
    } else if (isNaN(b3 as any)) {
      output += chars[enc1] + chars[enc2] + chars[enc3] + '=';
    } else {
      output += chars[enc1] + chars[enc2] + chars[enc3] + chars[enc4];
    }
  }
  return output;
};

// We use actions for Twilio network calls
export const requestOtp = action({
  args: { phone: v.string(), purpose: v.optional(v.string()) },
  handler: async (ctx, { phone, purpose }) => {
    // Normalize Indian numbers: ensure +91
    const normalized = phone.startsWith('+') ? phone : `+91${phone}`;

    // Generate a 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash minimally (not cryptographic strong, but avoids plain text at rest)
    const codeHash = await bcrypt.hash(code, 10);

    const now = Date.now();
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes

    // Store OTP
    await ctx.runMutation(api.otp.storeOtp, {
      phone: normalized,
      codeHash,
      createdAt: now,
      expiresAt,
      purpose,
    });

    // Send SMS via Twilio (env vars required)
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!sid || !token || !from) {
      // In dev, log and return the code so the frontend can display it temporarily.
      console.log(`[DEV OTP] ${normalized}: ${code}`);
      return { ok: true, dev: true, debugCode: code } as const;
    }

    const body = new URLSearchParams({
      To: normalized,
      From: from,
      Body: `Your Rojgar verification code is ${code}`,
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${base64Encode(`${sid}:${token}`)}`,
        },
        body,
      },
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Twilio error: ${res.status} ${t}`);
    }
    return { ok: true } as const;
  },
});

// storeOtp moved to otp.ts to avoid circular type references

export const verifyOtp = action({
  args: {
    phone: v.string(),
    code: v.string(),
    role: v.optional(v.union(v.literal('job-seeker'), v.literal('company'))),
  },
  handler: async (
    ctx,
    { phone, code, role },
  ): Promise<{
    userId?: string;
    exists: boolean;
    role?: 'job-seeker' | 'company';
    newlyCreated?: boolean;
  }> => {
    const normalized = phone.startsWith('+') ? phone : `+91${phone}`;
    const rec = (await ctx.runQuery(api.otp.latestOtpByPhone, {
      phone: normalized,
    })) as any;
    if (!rec) throw new Error('No OTP found');
    if (rec.consumed) throw new Error('OTP already used');
    if (Date.now() > rec.expiresAt) throw new Error('OTP expired');
    if (rec.attempts >= 5) throw new Error('Too many attempts');

    const isValid = await bcrypt.compare(code, rec.codeHash);
    if (!isValid) {
      await ctx.runMutation(api.otp.incrementOtpAttempts, { otpId: rec._id });
      throw new Error('Invalid code');
    }

    // If registering, upsert user only when user does not exist; if logging in (no role), only consume OTP
    if (role) {
      // Check if user already exists for this phone; if yes, do not overwrite role
      const existingUser = (await ctx.runQuery(api.users.getUserByPhone, {
        phone: normalized,
      })) as any;
      if (existingUser) {
        await ctx.runMutation(api.otp.consumeOtp, { otpId: rec._id });
        const profileResult = (await ctx.runQuery(
          api.profiles.getProfileByUserId,
          {
            userId: existingUser._id,
          },
        )) as any;
        const prof = profileResult?.profile;
        const derivedRole = prof?.companyData
          ? 'company'
          : prof?.jobSeekerData
            ? 'job-seeker'
            : existingUser.role;
        return {
          userId: existingUser._id,
          exists: true,
          role: derivedRole,
        } as any;
      }
      const result = (await ctx.runMutation(api.otp.consumeOtpAndUpsertUser, {
        otpId: rec._id,
        phone: normalized,
        role,
      })) as { userId: string };
      return { userId: result.userId, exists: true, role, newlyCreated: true };
    } else {
      await ctx.runMutation(api.otp.consumeOtp, { otpId: rec._id });
      // Determine if the user already exists
      const existingUser = (await ctx.runQuery(api.users.getUserByPhone, {
        phone: normalized,
      })) as any;
      if (existingUser) {
        // derive role from profile if available using runQuery (allowed in actions)
        const profileResult = (await ctx.runQuery(
          api.profiles.getProfileByUserId,
          {
            userId: existingUser._id,
          },
        )) as any;
        const prof = profileResult?.profile;
        const derivedRole = prof?.companyData
          ? 'company'
          : prof?.jobSeekerData
            ? 'job-seeker'
            : existingUser.role;
        return {
          userId: existingUser._id,
          exists: true,
          role: derivedRole,
        } as any;
      }
      return { exists: false };
    }
  },
});

// Check if user exists by phone. Used at /auth/phone to avoid sending OTP for new users.
export const checkUserExists = action({
  args: { phone: v.string() },
  handler: async (
    ctx,
    { phone },
  ): Promise<{ exists: boolean; role?: 'job-seeker' | 'company' }> => {
    const normalized = phone.startsWith('+') ? phone : `+91${phone}`;
    const user = (await ctx.runQuery(api.users.getUserByPhone, {
      phone: normalized,
    })) as any;
    if (!user) return { exists: false };
    const profResult = (await ctx.runQuery(api.profiles.getProfileByUserId, {
      userId: user._id,
    })) as any;
    const prof = profResult?.profile;
    const derivedRole = prof?.companyData
      ? 'company'
      : prof?.jobSeekerData
        ? 'job-seeker'
        : user.role;
    return { exists: true, role: derivedRole };
  },
});

export const setPassword = action({
  args: { userId: v.id('users'), password: v.string() },
  handler: async (ctx, { userId, password }): Promise<{ ok: true }> => {
    const passwordHash = await bcrypt.hash(password, 12);
    await ctx.runMutation(api.users_internal.savePasswordHash, {
      userId,
      passwordHash,
    });
    return { ok: true };
  },
});

export const createSession = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = Date.now();
    const expiresAt = now + 1000 * 60 * 60 * 24 * 30; // 30 days
    await ctx.db.insert('sessions', {
      userId,
      token,
      createdAt: now,
      expiresAt,
      revoked: false,
    });
    return { token, expiresAt };
  },
});

// Verify password by phone and create session (login via password)
export const verifyPassword = action({
  args: { phone: v.string(), password: v.string() },
  handler: async (
    ctx,
    { phone, password },
  ): Promise<{
    token: string;
    expiresAt: number;
    role: 'company' | 'job-seeker' | string;
    userId: string;
  }> => {
    const normalized = phone.startsWith('+') ? phone : `+91${phone}`;
    const user = (await ctx.runQuery(api.users.getUserByPhone, {
      phone: normalized,
    })) as any;
    if (!user || !user.passwordHash) throw new Error('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new Error('Invalid credentials');
    // derive role from profile
    const profResult = (await ctx.runQuery(api.profiles.getProfileByUserId, {
      userId: user._id,
    })) as any;
    const prof = profResult?.profile;
    const derivedRole = prof?.companyData
      ? 'company'
      : prof?.jobSeekerData
        ? 'job-seeker'
        : user.role;
    // create session
    const session = (await ctx.runMutation(api.auth.createSession, {
      userId: user._id,
    })) as { token: string; expiresAt: number };
    return {
      token: session.token,
      expiresAt: session.expiresAt,
      role: derivedRole,
      userId: user._id,
    };
  },
});

export const getUserBySession = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique();
    if (!session || session.revoked || Date.now() > session.expiresAt)
      return null;
    const user = await ctx.db.get(session.userId);
    return user;
  },
});

export const signOut = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique();
    if (session) await ctx.db.patch(session._id, { revoked: true });
    return { ok: true };
  },
});
