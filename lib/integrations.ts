// Integration types and helpers

export type IntegrationType = 'github' | 'google_fit' | 'strava';

export interface IntegrationConfig {
  type: IntegrationType;
  name: string;
  icon: string;
  description: string;
  tracksCategories: string[]; // category slugs this integration auto-tracks
  scopes: string[];
}

export const INTEGRATIONS: IntegrationConfig[] = [
  {
    type: 'github',
    name: 'GitHub',
    icon: '⌨️',
    description: 'Auto-track commits, PRs, and coding activity',
    tracksCategories: ['commits', 'coding', 'projects'],
    scopes: ['read:user', 'repo'],
  },
  {
    type: 'google_fit',
    name: 'Google Fit',
    icon: '❤️',
    description: 'Auto-track steps, calories, sleep, and workouts',
    tracksCategories: ['steps', 'calories', 'sleep', 'running', 'cycling'],
    scopes: [
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.body.read',
      'https://www.googleapis.com/auth/fitness.sleep.read',
    ],
  },
  {
    type: 'strava',
    name: 'Strava',
    icon: '🏃',
    description: 'Auto-track runs, rides, and swims',
    tracksCategories: ['running', 'cycling', 'swimming'],
    scopes: ['read', 'activity:read'],
  },
];

export const getIntegration = (type: IntegrationType) =>
  INTEGRATIONS.find((i) => i.type === type);
