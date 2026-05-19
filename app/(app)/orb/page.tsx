import { redirect } from 'next/navigation';

// The orb command center now lives on /dashboard. Bookmarks and any
// lingering deep links to /orb redirect there instead of 404ing.
export default function OrbPage() {
  redirect('/dashboard');
}
