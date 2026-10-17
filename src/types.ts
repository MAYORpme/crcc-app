export interface Announcement {
  id: string;
  text: string;
  link?: string;
  active: boolean;
  endsAt?: string; // ISO date; hidden after this day
  order: number;
}

export interface Advert {
  id: string;
  label: string; // e.g. PROJECT, PROGRAM, MEMBER BUSINESS
  title: string;
  subtitle?: string;
  image?: string;
  link?: string;
  cta?: string;
  active: boolean;
  endsAt?: string;
  order: number;
}

export type SermonCategory = 'Sunday' | 'Midweek' | 'Oxygen Class' | 'Special';

export interface Sermon {
  id: string;
  title: string;
  preacher: string;
  date: string; // ISO date
  category: SermonCategory;
  series?: string;
  scripture?: string;
  summary?: string;
  durationMin?: number;
  audioUrl?: string;
  videoUrl?: string; // YouTube link
  notesUrl?: string; // PDF
  image?: string;
}

export interface Lesson {
  id: string;
  date: string; // the Sunday it is taught
  topic: string;
  memoryVerse: string;
  memoryRef: string;
  passages: string[];
  intro?: string;
  outline: string[];
  questions: string[];
  manualUrl?: string;
  recordingUrl?: string;
}

export interface ChurchEvent {
  id: string;
  title: string;
  date: string; // ISO date
  time?: string;
  endDate?: string;
  venue?: string;
  description?: string;
  image?: string;
  registration: boolean;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  image?: string;
  target: number;
  raised: number;
  active: boolean;
  order: number;
}

export type GiftType = 'Tithe' | 'Offering' | 'Thanksgiving' | 'Seed' | 'Project' | 'Pledge' | 'Shop';

export interface Gift {
  id: string;
  uid?: string;
  reference: string;
  pledgeId?: string;
  orderId?: string;
  type: GiftType;
  projectId?: string;
  projectTitle?: string;
  amount: number; // naira
  name?: string;
  email: string;
  phone?: string;
  anonymous: boolean;
  recurring: boolean;
  status: 'success' | 'pending' | 'failed';
  channel?: string;
  createdAt: string;
  demo?: boolean;
}

export interface Registration {
  id: string;
  uid?: string;
  eventId: string;
  eventTitle: string;
  name: string;
  phone: string;
  email?: string;
  people: number;
  createdAt: string;
}

export interface FirstTimer {
  id: string;
  uid?: string;
  name: string;
  phone: string;
  email?: string;
  area?: string;
  howHeard?: string;
  prayer?: string;
  createdAt: string;
}

export interface Settings {
  id: 'main';
  isLive: boolean;
  liveUrl: string;
  liveTitle: string;
  serviceTimes: { label: string; time: string }[];
  phone: string;
  email: string;
  whatsapp: string;
  youtube: string;
  facebook: string;
  instagram: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  firstLadyName: string;
  firstLadyBio: string;
  vision: string;
  mission: string;
}

export type Role = 'super' | 'media' | 'communications' | 'finance' | 'pastoral';

export interface Member {
  id: string; // = auth uid
  name: string;
  email?: string;
  phone?: string;
  photo?: string;
  birthday?: string; // MM-DD
  anniversary?: string; // MM-DD (wedding)
  celebrate: boolean; // show my birthday/anniversary to the church
  gender?: 'Male' | 'Female' | '';
  area?: string;
  departments: string[];
  cellId?: string;
  firstTimer?: boolean;
  blocked?: boolean;
  createdAt: string;
  lastSeenAt?: string;
}

/** Public birthday/anniversary card, only for members who opt in. */
export interface Celebrant {
  id: string; // = uid
  name: string;
  photo?: string;
  birthday?: string; // MM-DD
  anniversary?: string; // MM-DD
}

export interface AdminRole {
  id: string; // = uid
  role: Role;
  name?: string;
  email?: string;
  addedAt?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  link?: string;
  audience: 'all' | string; // 'all', 'dept:<id>' or 'user:<uid>'
  createdAt: string;
  createdBy?: string;
  auto?: boolean;
}

export interface AuditEntry {
  id: string;
  uid: string;
  name: string;
  action: 'create' | 'update' | 'delete';
  collection: string;
  docId: string;
  summary: string;
  at: string;
}

export interface Album {
  id: string;
  title: string;
  date: string;
  cover?: string;
  photos: string[];
}

export interface Devotional {
  id: string;
  date: string; // the day it is for
  title: string;
  scripture: string; // reference
  verseText: string;
  body: string;
  prayer?: string;
  confession?: string;
  author?: string;
}

export interface PrayerRequest {
  id: string;
  uid: string;
  name: string;
  text: string;
  visibility: 'public' | 'pastors';
  anonymous: boolean;
  prayedBy: string[];
  status: 'open' | 'answered';
  createdAt: string;
}

export interface Testimony {
  id: string;
  uid: string;
  name: string;
  title: string;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  leader?: string;
  meets?: string;
  image?: string;
  order: number;
}

export interface DeptPost {
  id: string;
  deptId: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface Cell {
  id: string;
  name: string;
  area: string;
  address: string;
  host: string;
  phone?: string;
  meets: string; // e.g. "Fridays · 6pm"
  mapsQuery?: string;
}

export interface Pledge {
  id: string;
  uid: string;
  name: string;
  title: string; // what it's for
  projectId?: string;
  amount: number;
  paid: number;
  dueDate: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  uid: string;
  name: string;
  phone: string;
  topic: string;
  mode: 'In person' | 'Phone call';
  date: string;
  slot: string;
  note?: string;
  status: 'requested' | 'confirmed' | 'declined' | 'done';
  reply?: string;
  createdAt: string;
}

export interface ReadingPlan {
  id: string;
  title: string;
  description: string;
  days: string[]; // each day's readings, e.g. "John 1"
}

export interface PlanProgress {
  id: string; // `${uid}_${planId}`
  uid: string;
  planId: string;
  startedAt: string;
  done: number[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: 'Books' | 'Media' | 'Merchandise';
  price: number;
  image?: string;
  stock: number;
  active: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  uid: string;
  name: string;
  phone: string;
  email: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'paid' | 'ready' | 'collected' | 'cancelled';
  reference?: string;
  demo?: boolean;
  createdAt: string;
}

export interface Service {
  id: string;
  title: string;
  date: string;
  code: string; // secret in the QR link
  open: boolean;
  createdAt: string;
}

export interface Attendance {
  id: string; // `${serviceId}_${uid}`
  serviceId: string;
  uid: string;
  name: string;
  at: string;
}

export interface CollectionMap {
  announcements: Announcement;
  adverts: Advert;
  sermons: Sermon;
  lessons: Lesson;
  events: ChurchEvent;
  projects: Project;
  gifts: Gift;
  registrations: Registration;
  firstTimers: FirstTimer;
  settings: Settings;
  members: Member;
  celebrants: Celebrant;
  admins: AdminRole;
  notifications: AppNotification;
  audit: AuditEntry;
  albums: Album;
  devotionals: Devotional;
  prayers: PrayerRequest;
  testimonies: Testimony;
  departments: Department;
  deptPosts: DeptPost;
  cells: Cell;
  pledges: Pledge;
  appointments: Appointment;
  plans: ReadingPlan;
  planProgress: PlanProgress;
  products: Product;
  orders: Order;
  services: Service;
  attendance: Attendance;
}

export type CollectionName = keyof CollectionMap;
