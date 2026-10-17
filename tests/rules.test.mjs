// Security-rules tests. Run on a computer with Java installed:
//   npm run test:rules
// Uses the Firestore emulator; nothing touches the real database.
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';

let env;
const now = new Date().toISOString();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-crcc',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const member = (id, extra = {}) => setDoc(doc(db, 'members', id), { name: id, celebrate: true, departments: [], createdAt: now, ...extra });
    await member('alice');
    await member('bob');
    await member('blocked', { blocked: true });
    await member('superAdmin');
    await member('mediaAdmin');
    await member('financeAdmin');
    await member('pastor');
    await setDoc(doc(db, 'admins', 'superAdmin'), { role: 'super' });
    await setDoc(doc(db, 'admins', 'mediaAdmin'), { role: 'media' });
    await setDoc(doc(db, 'admins', 'financeAdmin'), { role: 'finance' });
    await setDoc(doc(db, 'admins', 'pastor'), { role: 'pastoral' });
    await setDoc(doc(db, 'sermons', 's1'), { title: 'Sunday Service' });
    await setDoc(doc(db, 'settings', 'main'), { isLive: false, liveUrl: '', bankName: 'X' });
    await setDoc(doc(db, 'gifts', 'g1'), { uid: 'alice', amount: 1000, status: 'success' });
    await setDoc(doc(db, 'prayers', 'p1'), { uid: 'alice', name: 'alice', text: 'Pray for me', visibility: 'public', prayedBy: [], status: 'open' });
    await setDoc(doc(db, 'prayers', 'p2'), { uid: 'alice', name: 'alice', text: 'Private', visibility: 'pastors', prayedBy: [], status: 'open' });
    await setDoc(doc(db, 'services', 'ABC123'), { title: 'Sunday', open: true });
    await setDoc(doc(db, 'services', 'CLOSED'), { title: 'Old', open: false });
  });
});

const as = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

describe('login required', () => {
  test('signed-out visitors read nothing', () => assertFails(getDoc(doc(as(null), 'sermons', 's1'))));
  test('members read sermons', () => assertSucceeds(getDoc(doc(as('alice'), 'sermons', 's1'))));
  test('paused members are locked out', () => assertFails(getDoc(doc(as('blocked'), 'sermons', 's1'))));
  test('paused members cannot unpause themselves', () => assertFails(updateDoc(doc(as('blocked'), 'members', 'blocked'), { blocked: false })));
});

describe('roles', () => {
  test('members cannot edit sermons', () => assertFails(setDoc(doc(as('alice'), 'sermons', 's2'), { title: 'x' })));
  test('media admin can add sermons', () => assertSucceeds(setDoc(doc(as('mediaAdmin'), 'sermons', 's2'), { title: 'x' })));
  test('media admin cannot edit projects', () => assertFails(setDoc(doc(as('mediaAdmin'), 'projects', 'p'), { title: 'x' })));
  test('media admin can go live', () => assertSucceeds(updateDoc(doc(as('mediaAdmin'), 'settings', 'main'), { isLive: true })));
  test('media admin cannot change bank details', () => assertFails(updateDoc(doc(as('mediaAdmin'), 'settings', 'main'), { bankName: 'Y' })));
  test('members cannot make themselves admin', () => assertFails(setDoc(doc(as('alice'), 'admins', 'alice'), { role: 'super' })));
  test('super admin can assign roles', () => assertSucceeds(setDoc(doc(as('superAdmin'), 'admins', 'alice'), { role: 'media' })));
  test('super admin cannot change own role', () => assertFails(setDoc(doc(as('superAdmin'), 'admins', 'superAdmin'), { role: 'media' })));
});

describe('privacy', () => {
  test('members read their own gifts', () => assertSucceeds(getDocs(query(collection(as('alice'), 'gifts'), where('uid', '==', 'alice')))));
  test('members cannot read others’ gifts', () => assertFails(getDoc(doc(as('bob'), 'gifts', 'g1'))));
  test('finance reads all gifts', () => assertSucceeds(getDocs(collection(as('financeAdmin'), 'gifts'))));
  test('media admin cannot read gifts', () => assertFails(getDocs(collection(as('mediaAdmin'), 'gifts'))));
  test('nobody can write gifts from the app', () => assertFails(setDoc(doc(as('superAdmin'), 'gifts', 'fake'), { uid: 'superAdmin', amount: 1e6 })));
  test('members cannot read other profiles', () => assertFails(getDoc(doc(as('bob'), 'members', 'alice'))));
  test('pastoral can read profiles', () => assertSucceeds(getDoc(doc(as('pastor'), 'members', 'alice'))));
  test('private prayer hidden from other members', () => assertFails(getDoc(doc(as('bob'), 'prayers', 'p2'))));
  test('private prayer visible to pastors', () => assertSucceeds(getDoc(doc(as('pastor'), 'prayers', 'p2'))));
});

describe('community', () => {
  test('member can say “I prayed”', () => assertSucceeds(updateDoc(doc(as('bob'), 'prayers', 'p1'), { prayedBy: arrayUnion('bob') })));
  test('member cannot add someone else to “I prayed”', () => assertFails(updateDoc(doc(as('bob'), 'prayers', 'p1'), { prayedBy: arrayUnion('alice') })));
  test('member cannot edit someone else’s prayer text', () => assertFails(updateDoc(doc(as('bob'), 'prayers', 'p1'), { text: 'changed' })));
  test('member cannot post an approved testimony', () =>
    assertFails(setDoc(doc(as('alice'), 'testimonies', 't'), { uid: 'alice', name: 'a', title: 'x', text: 'y', status: 'approved', createdAt: now })));
  test('member can submit a pending testimony', () =>
    assertSucceeds(setDoc(doc(as('alice'), 'testimonies', 't'), { uid: 'alice', name: 'a', title: 'x', text: 'y', status: 'pending', createdAt: now })));
  test('pledge must start unpaid', () =>
    assertFails(setDoc(doc(as('alice'), 'pledges', 'pl'), { uid: 'alice', name: 'a', title: 'x', amount: 1000, paid: 1000, dueDate: '2026-12-31', createdAt: now })));
});

describe('attendance', () => {
  test('check in to an open service', () => assertSucceeds(setDoc(doc(as('alice'), 'attendance', 'ABC123_alice'), { serviceId: 'ABC123', uid: 'alice', name: 'a', at: now })));
  test('cannot check in to a closed service', () => assertFails(setDoc(doc(as('alice'), 'attendance', 'CLOSED_alice'), { serviceId: 'CLOSED', uid: 'alice', name: 'a', at: now })));
  test('cannot check someone else in', () => assertFails(setDoc(doc(as('alice'), 'attendance', 'ABC123_bob'), { serviceId: 'ABC123', uid: 'bob', name: 'b', at: now })));
  test('members cannot list service codes', () => assertFails(getDocs(collection(as('alice'), 'services'))));
  test('member can check own (not yet created) check-in', () => assertSucceeds(getDoc(doc(as('alice'), 'attendance', 'ABC123_alice'))));
});

describe('audit log', () => {
  test('admins add entries as themselves', () => assertSucceeds(setDoc(doc(as('mediaAdmin'), 'audit', 'a1'), { uid: 'mediaAdmin', action: 'create' })));
  test('entries cannot be faked for someone else', () => assertFails(setDoc(doc(as('mediaAdmin'), 'audit', 'a2'), { uid: 'superAdmin', action: 'create' })));
  test('entries cannot be deleted', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'audit', 'a3'), { uid: 'superAdmin' }));
    await assertFails(deleteDoc(doc(as('superAdmin'), 'audit', 'a3')));
  });
});
