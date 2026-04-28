import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const DEFAULT_DATABASE_ID = 'ai-studio-0e73c385-eb8b-44ad-8d0b-940e22df006d';

const app = getApps().length > 0 ? getApp() : initializeApp();

export const firestoreDatabaseId =
  process.env.FIRESTORE_DATABASE_ID || DEFAULT_DATABASE_ID;

export const db = getFirestore(app, firestoreDatabaseId);
