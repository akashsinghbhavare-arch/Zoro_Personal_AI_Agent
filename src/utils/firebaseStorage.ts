// Firebase-backed storage for Nova AI
// Stores data in Firestore with localStorage as fallback when offline.
// All data is keyed by a STABLE user ID so Electron app + web share the same DB.

import {
  doc, setDoc, getDoc, collection,
  getDocs, deleteDoc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, rtdb } from '../lib/firebase';
import { User, Conversation, GeneratedImage, Project } from '../types';

// ─── Stable User ID ────────────────────────────────────────────────────────────
// Derived from the user's username so both Electron and web access the SAME data.
// Falls back to a persisted random ID only when no username exists yet.
export const getUserId = (): string => {
  // Try to get username from stored user profile
  try {
    const stored = localStorage.getItem('nova_user');
    if (stored) {
      const u = JSON.parse(stored);
      if (u?.username) {
        // Create a stable, URL-safe ID from username
        return `user_${u.username.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      }
    }
  } catch {}

  // Fallback: stable random ID persisted to localStorage
  let id = localStorage.getItem('nova_user_id');
  if (!id) {
    id = `nova_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('nova_user_id', id);
  }
  return id;
};


// ─── User Profile ─────────────────────────────────────────────────────────────

export const saveUserToFirebase = async (user: User): Promise<void> => {
  try {
    const uid = getUserId();
    await setDoc(doc(db, 'users', uid), {
      ...user,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('[Firebase] saveUser failed (offline?):', err);
  }
};

export const getUserFromFirebase = async (): Promise<User | null> => {
  try {
    const uid = getUserId();
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { updatedAt, ...user } = data;
      return user as User;
    }
  } catch (err) {
    console.warn('[Firebase] getUser failed (offline?):', err);
  }
  return null;
};

// ─── Conversations ────────────────────────────────────────────────────────────

export const saveConversationsToFirebase = async (conversations: Conversation[]): Promise<void> => {
  try {
    const uid = getUserId();
    const batch: Promise<void>[] = conversations.map(conv =>
      setDoc(doc(db, 'users', uid, 'conversations', conv.id), {
        ...conv,
        messages: conv.messages.map(m => ({
          ...m,
          timestamp: Timestamp.fromDate(m.timestamp),
        })),
        createdAt: Timestamp.fromDate(conv.createdAt),
        updatedAt: Timestamp.fromDate(conv.updatedAt),
      }, { merge: true })
    );
    await Promise.all(batch);
  } catch (err) {
    console.warn('[Firebase] saveConversations failed (offline?):', err);
  }
};

export const getConversationsFromFirebase = async (): Promise<Conversation[]> => {
  try {
    const uid = getUserId();
    const snap = await getDocs(collection(db, 'users', uid, 'conversations'));
    return snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
        messages: (data.messages ?? []).map((m: any) => ({
          ...m,
          timestamp: m.timestamp?.toDate ? m.timestamp.toDate() : new Date(m.timestamp),
        })),
      } as Conversation;
    }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (err) {
    console.warn('[Firebase] getConversations failed (offline?):', err);
  }
  return [];
};

export const deleteConversationFromFirebase = async (conversationId: string): Promise<void> => {
  try {
    const uid = getUserId();
    await deleteDoc(doc(db, 'users', uid, 'conversations', conversationId));
  } catch (err) {
    console.warn('[Firebase] deleteConversation failed:', err);
  }
};

// ─── Generated Images ─────────────────────────────────────────────────────────

export const saveImageToFirebase = async (image: GeneratedImage): Promise<void> => {
  try {
    const uid = getUserId();
    await setDoc(doc(db, 'users', uid, 'images', image.id), {
      ...image,
      createdAt: Timestamp.fromDate(image.createdAt),
    });
  } catch (err) {
    console.warn('[Firebase] saveImage failed:', err);
  }
};

export const getImagesFromFirebase = async (): Promise<GeneratedImage[]> => {
  try {
    const uid = getUserId();
    const snap = await getDocs(collection(db, 'users', uid, 'images'));
    return snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
      } as GeneratedImage;
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (err) {
    console.warn('[Firebase] getImages failed:', err);
  }
  return [];
};

// ─── Projects ─────────────────────────────────────────────────────────────────

export const saveProjectsToFirebase = async (projects: Project[]): Promise<void> => {
  try {
    const uid = getUserId();
    const batch: Promise<void>[] = projects.map(p =>
      setDoc(doc(db, 'users', uid, 'projects', p.id), {
        ...p,
        createdAt: Timestamp.fromDate(p.createdAt),
      }, { merge: true })
    );
    await Promise.all(batch);
  } catch (err) {
    console.warn('[Firebase] saveProjects failed:', err);
  }
};

// ─── Calendar Events ──────────────────────────────────────────────────────────

export const saveCalendarEventsToFirebase = async (events: any[]): Promise<void> => {
  try {
    const uid = getUserId();
    const batch: Promise<void>[] = events.map(ev =>
      setDoc(doc(db, 'users', uid, 'calendarEvents', ev.id), ev, { merge: true })
    );
    await Promise.all(batch);
  } catch (err) {
    console.warn('[Firebase] saveCalendarEvents failed:', err);
  }
};

export const getCalendarEventsFromFirebase = async (): Promise<any[]> => {
  try {
    const uid = getUserId();
    const snap = await getDocs(collection(db, 'users', uid, 'calendarEvents'));
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  } catch (err) {
    console.warn('[Firebase] getCalendarEvents failed:', err);
  }
  return [];
};

export const deleteCalendarEventFromFirebase = async (eventId: string): Promise<void> => {
  try {
    const uid = getUserId();
    await deleteDoc(doc(db, 'users', uid, 'calendarEvents', eventId));
  } catch (err) {
    console.warn('[Firebase] deleteCalendarEvent failed:', err);
  }
};

// ─── Realtime presence (active session marker) ─────────────────────────────────

export const setPresenceOnline = async (): Promise<void> => {
  try {
    const uid = getUserId();
    await set(ref(rtdb, `presence/${uid}`), {
      online: true,
      lastSeen: Date.now(),
      app: 'Nova AI',
    });
  } catch (err) {
    console.warn('[Firebase] setPresence failed:', err);
  }
};
