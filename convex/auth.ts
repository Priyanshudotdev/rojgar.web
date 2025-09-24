import { action, mutation, query } from './_generated/server';
import { api } from './_generated/api';
import { v } from 'convex/values';
import bcrypt from 'bcryptjs';
import { deriveUserRole } from '../lib/auth/redirect';
import { normalizePhoneNumber } from '../lib/utils/phone';
import { AuthError } from '../lib/utils/errors';

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

// Mask phone for logs: keep country and last 2-4 digits
function maskPhone(input: string | undefined): string {
  if (!input) return 'unknown';
  const s = String(input);
  const digits = s.replace(/\D/g, '');
  if (s.startsWith('+91') && digits.length >= 12) {
    const tail = digits.slice(-4);
    return `+91******${tail}`;
  }
  const tail = digits.slice(-2);
  return `****${tail}`;
}

// We use actions for Twilio network calls
export const requestOtp = action({
  args: { phone: v.string(), purpose: v.optional(v.string()) },
  handler: async (ctx, { phone, purpose }) => {
    // Normalize to canonical +91XXXXXXXXXX
    let normalized: string;
    try {
      normalized = normalizePhoneNumber(phone);
    } catch (e: any) {
      console.warn('[auth.requestOtp] Invalid phone normalization', {
        phoneMasked: maskPhone(phone),
      });
      throw new AuthError(
        'INVALID_PHONE',
        '[CODE: INVALID_PHONE] Invalid phone number',
        {
          category: 'auth',
        },
      );
    }

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

    // Send SMS via Twilio (env vars required) with robust development fallback
    const sidRaw = process.env?.TWILIO_ACCOUNT_SID;
    const tokenRaw = process.env?.TWILIO_AUTH_TOKEN;
    const fromRaw = process.env?.TWILIO_FROM_NUMBER;
    const sid = typeof sidRaw === 'string' ? sidRaw.trim() : '';
    const token = typeof tokenRaw === 'string' ? tokenRaw.trim() : '';
    const from = typeof fromRaw === 'string' ? fromRaw.trim() : '';

    const nodeEnv = (process.env?.NODE_ENV || '').trim().toLowerCase();
    const devMode = nodeEnv ? nodeEnv !== 'production' : true; // treat undefined/empty as development
    const hasTwilioCreds = Boolean(sid) && Boolean(token) && Boolean(from);

    if (!hasTwilioCreds) {
      // Universal fallback: return debug OTP when Twilio is not configured, in all environments.
      console.warn(
        '[auth.requestOtp] Twilio credentials missing - fallback mode active (returning debug OTP)',
        {
          nodeEnv: nodeEnv || '(unset)',
          devMode,
          sidPresent: Boolean(sid),
          tokenPresent: Boolean(token),
          fromPresent: Boolean(from),
        },
      );
      const masked = maskPhone(normalized);
      if (devMode) {
        console.log(`[DEV OTP] ${masked}: ${code}`);
      } else {
        console.info(
          '[auth.requestOtp] Fallback mode active (OTP returned to client)',
          { phoneMasked: masked },
        );
      }
      return { ok: true as const, dev: true as const, debugCode: code };
    }

    const body = new URLSearchParams({
      To: normalized,
      From: from,
      Body: `Your Rojgar verification code is ${code}`,
    });

    try {
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
        console.error('[auth.requestOtp] Twilio error', {
          status: res.status,
          body: t ? t.slice(0, 200) : '',
          nodeEnv: nodeEnv || '(unset)',
        });
        // Universal fallback on Twilio API error
        const masked = maskPhone(normalized);
        if (devMode) {
          console.log(`[DEV OTP] ${masked}: ${code}`);
        } else {
          console.info(
            '[auth.requestOtp] Fallback mode on Twilio API error (OTP returned to client)',
            { phoneMasked: masked },
          );
        }
        return { ok: true as const, dev: true as const, debugCode: code };
      }
      console.info('[auth.requestOtp] OTP requested via Twilio', {
        phoneMasked: maskPhone(normalized),
        purpose: purpose || null,
      });
      return { ok: true as const, dev: false as const };
    } catch (e: any) {
      console.error('[auth.requestOtp] Twilio network error', {
        err: e?.message || String(e),
        nodeEnv: nodeEnv || '(unset)',
      });
      // Universal fallback on network error
      const masked = maskPhone(normalized);
      if (devMode) {
        console.log(`[DEV OTP] ${masked}: ${code}`);
      } else {
        console.info(
          '[auth.requestOtp] Fallback mode on Twilio network error (OTP returned to client)',
          { phoneMasked: masked },
        );
      }
      return { ok: true as const, dev: true as const, debugCode: code };
    }
  },
});

// storeOtp moved to otp.ts to avoid circular type references

export const verifyOtp = action({
  args: {
    phone: v.string(),
    code: v.string(),
    role: v.optional(v.union(v.literal('job-seeker'), v.literal('company'))),
    onboardingData: v.optional(v.any()),
  },
  handler: async (
    ctx,
    { phone, code, role, onboardingData },
  ): Promise<{
    userId?: string;
    exists: boolean;
    role?: 'job-seeker' | 'company';
    newlyCreated?: boolean;
  }> => {
    let normalized: string;
    try {
      normalized = normalizePhoneNumber(phone);
    } catch (e: any) {
      console.warn('[auth.verifyOtp] Invalid phone normalization', {
        phoneMasked: maskPhone(phone),
      });
      throw new AuthError(
        'INVALID_PHONE',
        '[CODE: INVALID_PHONE] Invalid phone number',
        {
          category: 'auth',
        },
      );
    }
    const rec = (await ctx.runQuery(api.otp.latestOtpByPhone, {
      phone: normalized,
    })) as any;
    if (!rec) {
      console.warn('[auth.verifyOtp] OTP not found', {
        phoneMasked: maskPhone(normalized),
      });
      throw new AuthError('NOT_FOUND', '[CODE: NOT_FOUND] No OTP found', {
        category: 'auth',
      });
    }
    if (rec.consumed) {
      console.warn('[auth.verifyOtp] OTP already consumed', { otpId: rec._id });
      throw new AuthError('FORBIDDEN', '[CODE: FORBIDDEN] OTP already used', {
        category: 'auth',
      });
    }
    if (Date.now() > rec.expiresAt) {
      console.warn('[auth.verifyOtp] OTP expired', {
        otpId: rec._id,
        expiresAt: rec.expiresAt,
      });
      throw new AuthError(
        'SESSION_EXPIRED',
        '[CODE: SESSION_EXPIRED] OTP expired',
        {
          category: 'session',
        },
      );
    }
    if (rec.attempts >= 5) {
      console.warn('[auth.verifyOtp] Too many attempts', {
        otpId: rec._id,
        attempts: rec.attempts,
      });
      throw new AuthError('FORBIDDEN', '[CODE: FORBIDDEN] Too many attempts', {
        category: 'auth',
      });
    }

    const isValid = await bcrypt.compare(code, rec.codeHash);
    if (!isValid) {
      await ctx.runMutation(api.otp.incrementOtpAttempts, { otpId: rec._id });
      console.warn('[auth.verifyOtp] Invalid code', { otpId: rec._id });
      throw new AuthError('FORBIDDEN', '[CODE: FORBIDDEN] Invalid code', {
        category: 'auth',
      });
    }

    if (role && onboardingData) {
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
        const derivedRole = deriveUserRole(prof, existingUser);
        const result = {
          userId: existingUser._id,
          exists: true,
          ...(derivedRole ? { role: derivedRole } : {}),
        } as const;
        console.info('[auth.verifyOtp] Existing user OTP verified', {
          userId: existingUser._id,
          role: result.role || null,
        });
        return result;
      }
      const result = (await ctx.runMutation(api.otp.consumeOtpAndUpsertUser, {
        otpId: rec._id,
        phone: normalized,
        role,
        onboardingData,
      })) as { userId: string };
      console.info('[auth.verifyOtp] New user created via OTP', {
        userId: result.userId,
        role: role || null,
      });
      return { userId: result.userId, exists: true, role, newlyCreated: true };
    } else {
      await ctx.runMutation(api.otp.consumeOtp, { otpId: rec._id });
      const existingUser = (await ctx.runQuery(api.users.getUserByPhone, {
        phone: normalized,
      })) as any;
      if (existingUser) {
        const profileResult = (await ctx.runQuery(
          api.profiles.getProfileByUserId,
          {
            userId: existingUser._id,
          },
        )) as any;
        const prof = profileResult?.profile;
        const derivedRole = deriveUserRole(prof, existingUser);
        const result = {
          userId: existingUser._id,
          exists: true,
          ...(derivedRole ? { role: derivedRole } : {}),
        } as const;
        console.info(
          '[auth.verifyOtp] Existing user verified (no onboarding)',
          { userId: existingUser._id, role: result.role || null },
        );
        return result;
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
    let normalized: string;
    try {
      normalized = normalizePhoneNumber(phone);
    } catch (e: any) {
      console.warn('[auth.checkUserExists] Invalid phone normalization', {
        phoneMasked: maskPhone(phone),
      });
      throw new AuthError(
        'INVALID_PHONE',
        '[CODE: INVALID_PHONE] Invalid phone number',
        {
          category: 'auth',
        },
      );
    }
    const user = (await ctx.runQuery(api.users.getUserByPhone, {
      phone: normalized,
    })) as any;
    if (!user) {
      console.info('[auth.checkUserExists] No user for phone', {
        phoneMasked: maskPhone(normalized),
      });
      return { exists: false };
    }
    const profResult = (await ctx.runQuery(api.profiles.getProfileByUserId, {
      userId: user._id,
    })) as any;
    const prof = profResult?.profile;
    const derivedRole = deriveUserRole(prof, user) ?? undefined;
    console.info('[auth.checkUserExists] User found', {
      userId: user._id,
      role: derivedRole || null,
    });
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
    const t0 = Date.now();
    // Validate user exists
    const user = await ctx.db.get(userId);
    if (!user)
      throw new AuthError(
        'SERVER_ERROR',
        '[CODE: SERVER_ERROR] User not found',
        { category: 'server' },
      );
    // Crypto-strong token generator (64-hex string)
    function generateTokenHex(len = 32) {
      const cryptoObj: any = (globalThis as any).crypto;
      if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
        throw new AuthError(
          'SERVER_ERROR',
          '[CODE: SERVER_ERROR] Crypto API not available',
          { category: 'server' },
        );
      }
      const bytes = new Uint8Array(len);
      cryptoObj.getRandomValues(bytes);
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }

    const now = Date.now();
    const expiresAt = now + 1000 * 60 * 60 * 24 * 30; // 30 days

    let lastErr: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const token = generateTokenHex(32); // 64 hex chars
      const formatOk = /^[0-9a-f]{64}$/i.test(token);
      try {
        const tIns0 = Date.now();
        await ctx.db.insert('sessions', {
          userId,
          token,
          createdAt: now,
          expiresAt,
          revoked: false,
        });
        console.info('[auth.createSession] Session created', {
          userId,
          exp: expiresAt,
          attempt,
          tokenLen: token.length,
          tokenFormatOk: formatOk,
          insertMs: Date.now() - tIns0,
        });
        const totalMs = Date.now() - t0;
        if (totalMs > 200) {
          console.info('[auth.createSession] Slow path', { totalMs });
        }
        return { token, expiresAt };
      } catch (e: any) {
        lastErr = e;
        console.warn('[auth.createSession] Insert failed, retrying', {
          attempt,
          err: e?.message || e,
        });
        // Retry on insert error (possible unique conflict), up to 5 attempts
      }
    }
    console.error('[auth.createSession] Failed after retries', {
      userId,
      exp: expiresAt,
      err: lastErr?.message || lastErr,
    });
    throw new AuthError(
      'SESSION_CREATE_FAILED',
      '[CODE: SESSION_CREATE_FAILED] Failed to create session',
      { category: 'session' },
    );
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
    role?: 'company' | 'job-seeker';
    userId: string;
  }> => {
    let normalized: string;
    try {
      normalized = normalizePhoneNumber(phone);
    } catch (e: any) {
      console.warn('[auth.verifyPassword] Invalid phone normalization', {
        phoneMasked: maskPhone(phone),
      });
      throw new AuthError(
        'INVALID_PHONE',
        '[CODE: INVALID_PHONE] Invalid phone number',
        {
          category: 'auth',
        },
      );
    }
    const user = (await ctx.runQuery(api.users.getUserByPhone, {
      phone: normalized,
    })) as any;
    if (!user || !user.passwordHash) {
      console.warn(
        '[auth.verifyPassword] User not found or missing passwordHash',
      );
      throw new AuthError(
        'USER_NOT_FOUND',
        '[CODE: USER_NOT_FOUND] Invalid credentials',
        {
          category: 'auth',
        },
      );
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      console.warn('[auth.verifyPassword] Invalid password');
      throw new AuthError(
        'INVALID_PASSWORD',
        '[CODE: INVALID_PASSWORD] Invalid credentials',
        {
          category: 'auth',
        },
      );
    }
    // derive role from profile (harden with try/catch)
    let derivedRole: 'company' | 'job-seeker' | undefined = undefined;
    try {
      const profResult = (await ctx.runQuery(api.profiles.getProfileByUserId, {
        userId: user._id,
      })) as any;
      const prof = profResult?.profile;
      derivedRole = deriveUserRole(prof, user) ?? undefined;
    } catch (e: any) {
      console.warn(
        '[auth.verifyPassword] Failed to fetch profile for role derivation',
        e?.message || e,
      );
      derivedRole = undefined;
    }
    // create session
    const session = (await ctx.runMutation(api.auth.createSession, {
      userId: user._id,
    })) as { token: string; expiresAt: number };
    console.info('[auth.verifyPassword] Authentication successful', {
      userId: user._id,
    });
    return {
      token: session.token,
      expiresAt: session.expiresAt,
      ...(derivedRole ? { role: derivedRole } : {}),
      userId: user._id,
    };
  },
});

export const getUserBySession = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const t0 = Date.now();
    const formatOk = /^[0-9a-f]{64}$/i.test(token || '');
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique();
    if (!session) {
      console.warn('[auth.getUserBySession] Session not found', {
        tokenLen: token?.length || 0,
        tokenFormatOk: formatOk,
        dt: Date.now() - t0,
      });
      return null;
    }
    if (session.revoked) {
      console.warn('[auth.getUserBySession] Session revoked', {
        tokenLen: token.length,
        sessionId: session._id,
        userId: session.userId,
        tokenFormatOk: formatOk,
        dt: Date.now() - t0,
      });
      return null;
    }
    if (Date.now() > session.expiresAt) {
      console.warn('[auth.getUserBySession] Session expired', {
        tokenLen: token.length,
        exp: session.expiresAt,
        sessionId: session._id,
        userId: session.userId,
        tokenFormatOk: formatOk,
        now: Date.now(),
        dt: Date.now() - t0,
      });
      return null;
    }
    const tUser0 = Date.now();
    const user = await ctx.db.get(session.userId);
    if (!user) {
      console.warn('[auth.getUserBySession] User not found for session', {
        userId: session.userId,
        sessionId: session._id,
        dt: Date.now() - t0,
      });
      return null;
    }
    if (Date.now() - t0 > 200) {
      console.info('[auth.getUserBySession] Slow session lookup', {
        sessionId: session._id,
        userId: session.userId,
        elapsedMs: Date.now() - t0,
        userFetchMs: Date.now() - tUser0,
      });
    }
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
