// Starter content used in demo mode (and to seed a fresh Firestore).
// Everything here is SAMPLE content for church admins to replace.
import type { CollectionMap } from '../types';

type Seed = { [K in keyof CollectionMap]: CollectionMap[K][] };

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d;
};
/** The most recent Sunday, n weeks back (0 = this past/current Sunday). */
const sunday = (weeksBack: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - d.getDay() - weeksBack * 7);
  return iso(d);
};
/** Upcoming Sunday. */
const nextSunday = () => {
  const d = new Date(today);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  return iso(d);
};
const wednesday = (weeksBack: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - ((d.getDay() + 4) % 7) - weeksBack * 7);
  return iso(d);
};

const FOUNDER = 'Pastor Moses A. Egbeniyi';

export const seed: Seed = {
  settings: [
    {
      id: 'main',
      isLive: false,
      liveUrl: '',
      liveTitle: 'Sunday Service',
      serviceTimes: [
        { label: 'Oxygen Class (Sunday School)', time: 'Sunday · time to be confirmed' },
        { label: 'Sunday Service', time: 'Sunday · time to be confirmed' },
        { label: 'Midweek Service', time: 'Wednesday · time to be confirmed' },
      ],
      phone: '',
      email: '',
      whatsapp: '',
      youtube: '',
      facebook: '',
      instagram: '',
      bankName: '',
      accountName: 'Christ The Renewal Christian Church',
      accountNumber: '',
      firstLadyName: 'Pastor (Mrs) Egbeniyi',
      firstLadyBio:
        'Through her, God gave the name of the church: it would begin with “Christ” and end with “Church”. She serves alongside the founder in the ministry.',
      vision: 'To renew and transform lives and nations through the Word of God.',
      mission: 'Be not conformed to this world, but be transformed by the renewing of your mind. (Romans 12:2)',
    },
  ],

  announcements: [
    { id: 'a1', text: 'Oxygen Class holds before Sunday service. Come early and bring a friend.', active: true, order: 1 },
    { id: 'a2', text: 'Midweek service holds every Wednesday.', active: true, order: 2 },
    { id: 'a3', text: 'Give online: tithes, offerings and project support now on this site.', link: '/give', active: true, order: 3 },
  ],

  adverts: [
    {
      id: 'ad1',
      label: 'PROJECT',
      title: 'Church Building Project: be part of the story',
      subtitle: 'Every gift brings us closer to a permanent home.',
      link: '/give?project=p1',
      cta: 'Support',
      active: true,
      order: 1,
    },
    {
      id: 'ad2',
      label: 'OXYGEN CLASS',
      title: 'Breathe in the Word every Sunday',
      subtitle: 'Read this week’s lesson before you come.',
      link: '/oxygen',
      cta: 'Read lesson',
      image: '/images/minister2.jpg',
      active: true,
      order: 2,
    },
    {
      id: 'ad3',
      label: 'MEMBER BUSINESS',
      title: 'Advertise your business to the CRCC family',
      subtitle: 'Speak to the church office to place an advert here.',
      link: '/about#contact',
      cta: 'Learn more',
      active: true,
      order: 3,
    },
  ],

  sermons: [
    { id: 's1', title: 'Sunday Service', preacher: FOUNDER, date: sunday(0), category: 'Sunday', scripture: 'Romans 12:2', durationMin: 51, image: '/images/minister1.jpg' },
    { id: 's2', title: 'Midweek Service', preacher: FOUNDER, date: wednesday(0), category: 'Midweek', durationMin: 38, image: '/images/minister2.jpg' },
    { id: 's3', title: 'Sunday Service', preacher: FOUNDER, date: sunday(1), category: 'Sunday', durationMin: 47, image: '/images/founder.jpg' },
    { id: 's4', title: 'Oxygen Class: The Renewed Mind', preacher: 'Oxygen Class', date: sunday(1), category: 'Oxygen Class', scripture: 'Romans 12:1–2', durationMin: 30, image: '/images/firstlady.jpg' },
    { id: 's5', title: 'Midweek Service', preacher: FOUNDER, date: wednesday(1), category: 'Midweek', durationMin: 41, image: '/images/minister2.jpg' },
    { id: 's6', title: 'Sunday Service', preacher: FOUNDER, date: sunday(2), category: 'Sunday', durationMin: 55, image: '/images/minister1.jpg' },
  ],

  lessons: [
    {
      id: 'l1',
      date: nextSunday(),
      topic: 'The Renewed Mind',
      memoryVerse:
        'And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.',
      memoryRef: 'Romans 12:2',
      passages: ['Romans 12:1–2', 'Ephesians 4:22–24', 'Philippians 4:8'],
      intro:
        'Transformation begins on the inside. This lesson looks at what it means to have our minds renewed by God’s Word, and how a renewed mind changes the way we live.',
      outline: [
        'Do not be conformed: the pressure of the world around us (Romans 12:2a)',
        'Be transformed: change that starts from within (Ephesians 4:22–24)',
        'Renewing the mind daily: what we think on (Philippians 4:8)',
        'Proving God’s will: a life that shows His good, acceptable and perfect will',
      ],
      questions: [
        'What are some ways the world tries to shape how we think?',
        'What is one habit that can help renew your mind this week?',
      ],
    },
    {
      id: 'l2',
      date: sunday(0),
      topic: 'Presenting Our Bodies a Living Sacrifice',
      memoryVerse:
        'I beseech you therefore, brethren, by the mercies of God, that ye present your bodies a living sacrifice, holy, acceptable unto God, which is your reasonable service.',
      memoryRef: 'Romans 12:1',
      passages: ['Romans 12:1', '1 Corinthians 6:19–20'],
      outline: ['The mercies of God', 'A living sacrifice', 'Our reasonable service'],
      questions: ['What does it look like to offer your daily life to God?'],
      recordingUrl: '',
    },
    {
      id: 'l3',
      date: sunday(1),
      topic: 'Called for a Purpose',
      memoryVerse:
        'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.',
      memoryRef: 'Jeremiah 29:11',
      passages: ['Jeremiah 29:11', 'Exodus 3:1–10'],
      outline: ['God calls ordinary people', 'Answering the call', 'Walking in purpose'],
      questions: ['How has God been calling you to serve?'],
    },
  ],

  events: [
    {
      id: 'e1',
      title: 'CRCC Anniversary Thanksgiving',
      date: `${today.getMonth() === 11 && today.getDate() > 1 ? today.getFullYear() + 1 : today.getFullYear()}-12-01`,
      time: 'Time to be announced',
      venue: 'CRCC, Olode, Ibadan',
      description:
        'Celebrating the day it all began, 1 December 2013, when CRCC started in our founder’s living room. Come and give thanks with us.',
      image: '/images/minister1.jpg',
      registration: true,
    },
    {
      id: 'e2',
      title: 'Christmas Service',
      date: `${today.getFullYear()}-12-25`,
      time: 'Time to be announced',
      venue: 'CRCC, Olode, Ibadan',
      description: 'Celebrate the birth of our Lord Jesus Christ with the CRCC family.',
      registration: false,
    },
    {
      id: 'e3',
      title: 'Crossover Night',
      date: `${today.getFullYear()}-12-31`,
      time: 'Late night',
      venue: 'CRCC, Olode, Ibadan',
      description: 'Cross into the new year in the presence of God.',
      image: '/images/minister2.jpg',
      registration: true,
    },
    {
      id: 'e4',
      title: 'Midweek Service',
      date: iso(addDays(((3 - today.getDay() + 7) % 7) || 7)),
      time: 'Time to be confirmed',
      venue: 'CRCC, Olode, Ibadan',
      description: 'Teaching, prayer and fellowship in the middle of the week.',
      registration: false,
    },
  ],

  projects: [
    {
      id: 'p1',
      title: 'Church Building Project',
      description: 'Building a permanent worship centre for the CRCC family in Olode, Ibadan.',
      image: '/images/minister1.jpg',
      target: 25_000_000,
      raised: 0,
      active: true,
      order: 1,
    },
    {
      id: 'p2',
      title: 'Media & Sound Equipment',
      description: 'New sound and streaming equipment so every service can reach members wherever they are.',
      image: '/images/minister2.jpg',
      target: 5_000_000,
      raised: 0,
      active: true,
      order: 2,
    },
  ],

  gifts: [],
  registrations: [],
  firstTimers: [],

  // ── Members & admins (demo accounts: admin@crcc.demo / member@crcc.demo, password crcc2026) ──
  members: [
    { id: 'demo-admin', name: 'Admin User', email: 'admin@crcc.demo', phone: '08030000000', celebrate: false, departments: ['d3'], createdAt: iso(addDays(-200)) },
    {
      id: 'demo-member',
      name: 'Adebayo Ogunleye',
      email: 'member@crcc.demo',
      phone: '08031234567',
      birthday: mmdd(addDays(2)),
      celebrate: true,
      gender: 'Male',
      area: 'Olode',
      departments: ['d1'],
      cellId: 'c1',
      createdAt: iso(addDays(-90)),
    },
  ],
  celebrants: [{ id: 'demo-member', name: 'Adebayo Ogunleye', birthday: mmdd(addDays(2)) }],
  admins: [{ id: 'demo-admin', role: 'super', name: 'Admin User', email: 'admin@crcc.demo', addedAt: iso(addDays(-200)) }],

  notifications: [
    { id: 'n1', title: 'Welcome to the CRCC app', body: 'Give, listen to sermons, read the daily devotional and stay connected with the church family.', audience: 'all', createdAt: new Date(Date.now() - 864e5).toISOString(), auto: true },
  ],
  audit: [],

  albums: [
    { id: 'al1', title: 'Sunday Service', date: sunday(1), cover: '/images/minister1.jpg', photos: ['/images/minister1.jpg', '/images/minister2.jpg', '/images/firstlady.jpg'] },
    { id: 'al2', title: 'Our Founder', date: sunday(3), cover: '/images/founder.jpg', photos: ['/images/founder.jpg'] },
  ],

  devotionals: [
    dev(-3, 'Mercies New Every Morning', 'Lamentations 3:22–23', 'It is of the LORD’s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.',
      'Yesterday’s mistakes do not cancel today’s mercy. Each morning God meets us with fresh compassion, not leftover patience. Before you face the day’s demands, receive what He has already prepared for you.',
      'Lord, thank You for mercy that is new this morning. Help me walk in Your faithfulness today. Amen.'),
    dev(-2, 'Pray About Everything', 'Philippians 4:6–7', 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.',
      'Worry carries tomorrow’s burdens with today’s strength. Paul gives another way: turn every care into a prayer, and mix it with thanksgiving. The promise is not that every situation changes at once, but that God’s peace will guard your heart while He works.',
      'Father, I bring You the things that worry me. I thank You for what You have already done. Let Your peace guard my heart and mind. Amen.'),
    dev(-1, 'Strength for the Waiting', 'Isaiah 40:31', 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.',
      'Waiting on God is not doing nothing. It is trusting Him enough to keep going at His pace. Those who wait on Him are renewed: strength exchanged, not just restored.',
      'Lord, renew my strength as I wait on You. Teach me to trust Your timing. Amen.'),
    dev(0, 'Transformed, Not Conformed', 'Romans 12:2', 'And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.',
      'This verse gave our church its name. The world presses us into its shape every day, through what we watch, hear and think about. God’s answer is renewal from the inside: as His Word fills our minds, our lives begin to show His good and perfect will.',
      'Lord, renew my mind by Your Word today. Where I have been shaped by the world, transform me by Your Spirit. Amen.',
      'My mind is being renewed. I am transformed, not conformed.'),
    dev(1, 'All Things New', '2 Corinthians 5:17', 'Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.',
      'In Christ you are not a repaired version of your old self; you are a new creation. Your past may explain you, but it no longer defines you. Live today from who God says you are.',
      'Thank You, Lord, that in Christ I am a new creation. Help me live from my new identity today. Amen.'),
    dev(2, 'A Lamp for Your Feet', 'Psalm 119:105', 'Thy word is a lamp unto my feet, and a light unto my path.',
      'A lamp does not light up the whole road at once; it shows the next step. God’s Word gives enough light for the step in front of you. Read it daily, and take the next step it shows.',
      'Lord, let Your Word light my path today, one step at a time. Amen.'),
    dev(3, 'Be Strong and Courageous', 'Joshua 1:9', 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.',
      'Joshua faced a task bigger than himself, and God’s answer was His presence. Courage is not the absence of fear; it is choosing to move because God goes with you.',
      'Lord, thank You for going with me wherever I go. Give me courage for what is ahead. Amen.'),
  ],

  prayers: [
    { id: 'pr1', uid: 'demo-member', name: 'Adebayo Ogunleye', text: 'Please pray for my mother’s health and quick recovery.', visibility: 'public', anonymous: false, prayedBy: ['demo-admin'], status: 'open', createdAt: new Date(Date.now() - 2 * 864e5).toISOString() },
    { id: 'pr2', uid: 'demo-admin', name: 'Admin User', text: 'Pray for open doors as I search for a new job.', visibility: 'public', anonymous: true, prayedBy: [], status: 'open', createdAt: new Date(Date.now() - 5 * 3600e3).toISOString() },
  ],

  testimonies: [
    { id: 't1', uid: 'demo-member', name: 'Adebayo Ogunleye', title: 'God came through', text: 'Sample testimony: I asked the church to pray with me about my exams, and I passed every paper. Thank You, Jesus!', status: 'approved', createdAt: new Date(Date.now() - 7 * 864e5).toISOString() },
  ],

  departments: [
    { id: 'd1', name: 'Choir', description: 'Leading the church in praise and worship.', meets: 'Rehearsals on Saturdays', order: 1 },
    { id: 'd2', name: 'Ushering', description: 'Welcoming members and guests, and keeping services orderly.', order: 2 },
    { id: 'd3', name: 'Media & Technical', description: 'Sound, projection, livestream, photography and this app.', order: 3 },
    { id: 'd4', name: 'Children’s Church', description: 'Teaching children the Word in a way they understand.', order: 4 },
    { id: 'd5', name: 'Youth', description: 'Young people growing in faith together.', order: 5 },
    { id: 'd6', name: 'Prayer Team', description: 'Standing in prayer for the church and its members.', order: 6 },
    { id: 'd7', name: 'Sanctuary', description: 'Keeping God’s house clean and beautiful.', order: 7 },
  ],
  deptPosts: [
    { id: 'dp1', deptId: 'd1', text: 'Rehearsal holds this Saturday. Please be punctual.', author: 'Choir', createdAt: new Date(Date.now() - 864e5).toISOString() },
  ],

  cells: [
    { id: 'c1', name: 'Olode Fellowship', area: 'Olode', address: 'Address to be added', host: 'Host to be added', meets: 'Fridays · time to be confirmed', mapsQuery: 'Olode Ibadan' },
    { id: 'c2', name: 'Moniya Fellowship', area: 'Moniya', address: 'Address to be added', host: 'Host to be added', meets: 'Fridays · time to be confirmed', mapsQuery: 'Moniya Ibadan' },
    { id: 'c3', name: 'Ojoo Fellowship', area: 'Ojoo', address: 'Address to be added', host: 'Host to be added', meets: 'Fridays · time to be confirmed', mapsQuery: 'Ojoo Ibadan' },
  ],

  pledges: [
    { id: 'pl1', uid: 'demo-member', name: 'Adebayo Ogunleye', title: 'Church Building Project', projectId: 'p1', amount: 100000, paid: 25000, dueDate: `${today.getFullYear()}-12-31`, createdAt: iso(addDays(-30)) },
  ],

  appointments: [],

  plans: [
    { id: 'rp1', title: 'The Gospel of John in 21 days', description: 'Walk with Jesus through John’s Gospel, one chapter a day.', days: Array.from({ length: 21 }, (_, i) => `John ${i + 1}`) },
    { id: 'rp2', title: 'Proverbs in a month', description: 'One chapter of wisdom for each day of the month.', days: Array.from({ length: 31 }, (_, i) => `Proverbs ${i + 1}`) },
    { id: 'rp3', title: 'Renewing the Mind', description: 'Seven days on transformation, inspired by Romans 12:2.', days: ['Romans 12', 'Ephesians 4', 'Philippians 4', 'Colossians 3', '2 Corinthians 5', 'Psalm 1', 'Joshua 1'] },
  ],
  planProgress: [],

  products: [
    { id: 'sp1', name: 'Oxygen Class Manual', description: 'This quarter’s Sunday School manual.', category: 'Books', price: 1500, stock: 50, active: true },
    { id: 'sp2', name: 'CRCC T-shirt', description: 'Cotton T-shirt with the CRCC “Transforming Lives” logo.', category: 'Merchandise', price: 6000, stock: 30, active: true },
    { id: 'sp3', name: 'Sermon flash drive', description: 'A month of Sunday sermons on a USB flash drive.', category: 'Media', price: 4000, stock: 20, active: true },
    { id: 'sp4', name: 'CRCC Mug', description: 'Ceramic mug with the church logo.', category: 'Merchandise', price: 3500, stock: 25, active: true },
  ],
  orders: [],

  services: [{ id: 'CRCC26', title: 'Sunday Service', date: sunday(0), code: 'CRCC26', open: true, createdAt: iso(addDays(-1)) }],
  attendance: [],
};

function mmdd(d: Date) {
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dev(offset: number, title: string, scripture: string, verseText: string, body: string, prayer: string, confession?: string) {
  return { id: 'dv' + (offset + 10), date: iso(addDays(offset)), title, scripture, verseText, body, prayer, confession, author: 'Sample devotional' };
}
