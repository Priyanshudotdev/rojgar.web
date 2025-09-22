Unhandled Runtime Error
Error: Hydration failed because the initial UI does not match what was rendered on the server.

Warning: Expected server HTML to contain a matching <div> in <div>.

See more info here: https://nextjs.org/docs/messages/react-hydration-error

Unhandled Runtime Error
Error: Hydration failed because the initial UI does not match what was rendered on the server.

Warning: Expected server HTML to contain a matching <div> in <div>.

See more info here: https://nextjs.org/docs/messages/react-hydration-error

Component Stack
div


Unhandled Runtime Error
Error: There was an error while hydrating. Because the error happened outside of a Suspense boundary, the entire root will switch to client rendering.

app-index.js:32 Warning: Expected server HTML to contain a matching <div> in <div>.
    at div
    at div
    at div
    at div
    at div
    at DashboardShell (webpack-internal:///(app-pages-browser)/./app/dashboard/layout.tsx:21:11)
    at InnerLayoutRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:240:11)
    at RedirectErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:72:9)
    at RedirectBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:80:11)
    at NotFoundErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:54:9)
    at NotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:62:11)
    at LoadingBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:337:11)
    at ErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:110:11)
    at InnerScrollAndFocusHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:151:9)
    at ScrollAndFocusHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:226:11)
    at RenderFromTemplateContext (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/render-from-template-context.js:15:44)
    at OuterLayoutRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/layout-router.js:347:11)
    at div
    at MeProvider (webpack-internal:///(app-pages-browser)/./components/providers/me-provider.tsx:16:11)
    at ConvexProvider (webpack-internal:///(app-pages-browser)/./node_modules/convex/dist/esm/react/client.js:371:27)
    at ConvexClientProvider (webpack-internal:///(app-pages-browser)/./components/ConvexClientProvider.tsx:11:11)
    at body
    at html
    at RedirectErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:72:9)
    at RedirectBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/redirect-boundary.js:80:11)
    at NotFoundErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:54:9)
    at NotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/not-found-boundary.js:62:11)
    at DevRootNotFoundBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/dev-root-not-found-boundary.js:32:11)
    at ReactDevOverlay (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/react-dev-overlay/internal/ReactDevOverlay.js:66:9)
    at HotReload (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/react-dev-overlay/hot-reloader-client.js:287:11)
    at Router (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/app-router.js:157:11)
    at ErrorBoundaryHandler (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:82:9)
    at ErrorBoundary (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/error-boundary.js:110:11)
    at AppRouter (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/app-router.js:440:13)
    at ServerRoot (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/app-index.js:123:11)
    at RSCComponent
    at Root (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/app-index.js:139:11)
window.console.error @ app-index.js:32
react-dom.development.js:6790 Uncaught Error: Hydration failed because the initial UI does not match what was rendered on the server.

Warning: Expected server HTML to contain a matching <div> in <div>.

See more info here: https://nextjs.org/docs/messages/react-hydration-error
    at throwOnHydrationMismatch (react-dom.development.js:6790:9)
    at tryToClaimNextHydratableInstance (react-dom.development.js:6835:7)
    at updateHostComponent$1 (react-dom.development.js:15530:5)
    at beginWork$1 (react-dom.development.js:17374:14)
    at HTMLUnknownElement.callCallback (react-dom.development.js:19462:14)
    at Object.invokeGuardedCallbackImpl (react-dom.development.js:19511:16)
    at invokeGuardedCallback (react-dom.development.js:19586:29)
    at beginWork (react-dom.development.js:25724:7)
    at performUnitOfWork (react-dom.development.js:24553:12)
    at workLoopConcurrent (react-dom.development.js:24539:5)
    at renderRootConcurrent (react-dom.development.js:24495:9)
    at performConcurrentWorkOnRoot (react-dom.development.js:23359:38)
    at workLoop (scheduler.development.js:261:34)
    at flushWork (scheduler.development.js:230:14)
    at MessagePort.performWorkUntilDeadline (scheduler.development.js:534:21)
app-index.js:32 Warning: An error occurred during hydration. The server HTML was replaced with client content in <#document>.
window.console.error @ app-index.js:32
5on-recoverable-error.js:20 Uncaught Error: Hydration failed because the initial UI does not match what was rendered on the server.

Warning: Expected server HTML to contain a matching <div> in <div>.

See more info here: https://nextjs.org/docs/messages/react-hydration-error
    at throwOnHydrationMismatch (react-dom.development.js:6790:9)
    at tryToClaimNextHydratableInstance (react-dom.development.js:6835:7)
    at updateHostComponent$1 (react-dom.development.js:15530:5)
    at beginWork$1 (react-dom.development.js:17374:14)
    at beginWork (react-dom.development.js:25702:14)
    at performUnitOfWork (react-dom.development.js:24553:12)
    at workLoopConcurrent (react-dom.development.js:24539:5)
    at renderRootConcurrent (react-dom.development.js:24495:9)
    at performConcurrentWorkOnRoot (react-dom.development.js:23359:38)
    at workLoop (scheduler.development.js:261:34)
    at flushWork (scheduler.development.js:230:14)
    at MessagePort.performWorkUntilDeadline (scheduler.development.js:534:21)
react-dom.development.js:15478 Uncaught Error: There was an error while hydrating. Because the error happened outside of a Suspense boundary, the entire root will switch to client rendering.
    at updateHostRoot (react-dom.development.js:15478:57)
    at beginWork$1 (react-dom.development.js:17357:14)
    at beginWork (react-dom.development.js:25702:14)
    at performUnitOfWork (react-dom.development.js:24553:12)
    at workLoopSync (react-dom.development.js:24269:5)
    at renderRootSync (react-dom.development.js:24224:7)
    at recoverFromConcurrentError (react-dom.development.js:23452:20)
    at performConcurrentWorkOnRoot (react-dom.development.js:23397:26)
    at workLoop (scheduler.development.js:261:34)
    at flushWork (scheduler.development.js:230:14)
    at MessagePort.performWorkUntilDeadline (scheduler.development.js:534:21)