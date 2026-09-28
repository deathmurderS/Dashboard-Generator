import { redirect } from 'next/navigation';

/**
 * Root route — the application front door.
 *
 * - Signed-in visitors are sent to /workspace by the middleware.
 * - Everyone else lands directly on the sign-in screen.
 * - The marketing landing page is intentionally not part of the flow;
 *   this page only exists as a fallback redirect in case the middleware
 *   is ever bypassed.
 */
export default function RootPage() {
  redirect('/login');
}