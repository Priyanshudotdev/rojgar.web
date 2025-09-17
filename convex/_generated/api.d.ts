/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as files from "../files.js";
import type * as jobs from "../jobs.js";
import type * as notifications from "../notifications.js";
import type * as otp from "../otp.js";
import type * as profiles from "../profiles.js";
import type * as users from "../users.js";
import type * as users_internal from "../users_internal.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  files: typeof files;
  jobs: typeof jobs;
  notifications: typeof notifications;
  otp: typeof otp;
  profiles: typeof profiles;
  users: typeof users;
  users_internal: typeof users_internal;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
