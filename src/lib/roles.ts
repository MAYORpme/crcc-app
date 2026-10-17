import type { Role } from '../types';

export const ROLES: { id: Role; label: string; does: string }[] = [
  { id: 'super', label: 'Super admin', does: 'Everything, including members, admins, settings and the audit log' },
  { id: 'media', label: 'Media', does: 'Sermons, Oxygen Class, devotionals, gallery, reading plans, going live' },
  { id: 'communications', label: 'Communications', does: 'Announcements, adverts, events, notifications, departments, house fellowships' },
  { id: 'finance', label: 'Finance', does: 'Giving, projects, pledges, bookshop products and orders' },
  { id: 'pastoral', label: 'Pastoral', does: 'First-timers, prayer requests, testimonies, counselling, attendance' },
];

/** Which admin roles may manage each admin area. Super admins may manage everything. */
export const AREA_ROLES: Record<string, Role[]> = {
  dashboard: ['media', 'communications', 'finance', 'pastoral'],
  live: ['media', 'communications'],
  announcements: ['communications'],
  adverts: ['communications'],
  events: ['communications'],
  notifications: ['communications'],
  departments: ['communications'],
  deptPosts: ['communications'],
  cells: ['communications'],
  sermons: ['media'],
  lessons: ['media'],
  devotionals: ['media'],
  albums: ['media'],
  plans: ['media'],
  projects: ['finance'],
  giving: ['finance'],
  pledges: ['finance'],
  products: ['finance'],
  orders: ['finance'],
  people: ['pastoral'],
  prayers: ['pastoral'],
  testimonies: ['pastoral'],
  appointments: ['pastoral'],
  attendance: ['pastoral'],
  members: [],
  audit: [],
  settings: [],
};

export const can = (role: Role | null | undefined, area: string) =>
  Boolean(role && (role === 'super' || (AREA_ROLES[area] ?? []).includes(role)));

export const roleLabel = (r?: Role | null) => ROLES.find((x) => x.id === r)?.label ?? 'Member';
