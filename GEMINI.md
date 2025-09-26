Title: Dashboard shows “Background Dashboard Error – NETWORK_ERROR” on hard refresh until auth loads

Summary
On a full page reload (Ctrl+R) of any dashboard route, the UI briefly or persistently shows:
- “Background”
- “Dashboard Error”
- “Connection issue. Please check your internet and try again.”
- “Code: NETWORK_ERROR”
Alongside a status line like: idleNETWORK_ERRORhist:NETWORK_ERRORrefetchfakeUpdclear

This reproduces even on stable connections. After a few seconds or a manual retry, data may load. The issue is most visible on initial loads and incognito sessions.

Environment
- App Router (Next.js 13+/14), Convex backend with live queries
- Windows (Chrome/Edge), also seen in macOS browsers
- Auth: [fill in provider: NextAuth/Clerk/Auth0/Convex Auth/etc.]

Steps to Reproduce
1. Sign in and navigate to any dashboard page (job-seeker or company).
2. Perform a hard refresh (Ctrl+R / Cmd+R).
3. Observe the header and content area: the page shows “Dashboard Error” with “Code: NETWORK_ERROR”.
4. Open the console and Convex logs:
   - Convex Q(chat:getMessages): ArgumentValidationError when args missing (if any)
   - Convex Q(chat:getUnreadCount): UNAUTHENTICATED until auth/session is ready
   - NETWORK_ERROR surfaced in UI during this window

Expected
- On refresh, the app should render a loading/skeleton state.
- Queries should start only after auth/session and required IDs (e.g., profileId) are available.
- If offline, show a clear offline banner and auto-retry; otherwise no transient error state.

Actual
- Network/unauthenticated errors are rendered as page errors during the auth/session initialization window.
- Some queries run with empty args ({}), causing Convex validator errors, or run before auth is ready, causing UNAUTHENTICATED → surfaced as NETWORK_ERROR.

Artifacts
- UI text: “Connection issue. Please check your internet and try again. Code: NETWORK_ERROR”
- Console/Server logs include:
  - ArgumentValidationError: missing required field conversationId
  - UNAUTHENTICATED from getUnreadCount
  - Query state line: idleNETWORK_ERRORhist:NETWORK_ERRORrefetchfakeUpdclear

Suspected Root Cause
- Queries fire before authentication and prerequisite IDs are ready (SSR/CSR boundary).
- Error boundary surfaces initial transient errors as a dashboard error.
- Some hooks don’t skip queries when args are undefined (or pass null to validators expecting strings).
- getUnreadCount runs without a session.

Proposed Fix
- Gate all Convex queries behind auth readiness:
  - Use useConvexAuth / Authenticated wrapper; don’t issue queries until isAuthenticated && !isLoading.
  - In hooks (useCachedConvexQuery), truly skip the query when args are undefined (don’t call useQuery at all).
  - For paginated list queries, omit cursor fields entirely if not set; never pass null where v.string() is expected.
- For conversation-specific queries, don’t run until conversationId exists.
- Map initial NETWORK_ERROR to a non-fatal loading state; add retry/backoff.
- Keep UNAUTHENTICATED errors out of the main UI during auth bootstrap; show skeleton.

Acceptance Criteria
- Hard refresh no longer shows the dashboard error; only skeletons until auth is ready.
- No Convex validator errors (no null/undefined for required fields).
- If offline, user sees an offline banner with auto-retry; otherwise seamless load.
- QA: Repeat steps above across both dashboards and with slow 3G throttling.