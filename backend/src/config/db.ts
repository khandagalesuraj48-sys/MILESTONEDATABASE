import { MongoClient, Db, GridFSBucket, Collection } from 'mongodb';
import dotenv from 'dotenv';
import {
  CandidateDocument,
  CounterDocument,
  DropdownDocument,
  PlatformModule,
  AuditLogDocument,
  DocumentMetadataDocument,
  EmployeeDocument,
  InterviewEventDocument,
  SettingsDocument,
} from '../models/types';

dotenv.config();

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let cachedBucket: GridFSBucket | null = null;

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'milestone_database';

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI environment variable is not defined. Please set MONGODB_URI in your .env or environment configuration.'
    );
  }

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  await client.connect();
  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;
  cachedBucket = new GridFSBucket(db, { bucketName: 'resumes' });

  console.log(`[MongoDB] Connected to database: ${db.databaseName} on Cluster0`);

  return { client, db };
}

export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

export async function getGridFSBucket(): Promise<GridFSBucket> {
  if (cachedBucket) return cachedBucket;
  const { db } = await connectToDatabase();
  cachedBucket = new GridFSBucket(db, { bucketName: 'resumes' });
  return cachedBucket;
}

export async function getCandidatesCollection(): Promise<Collection<CandidateDocument>> {
  const db = await getDb();
  return db.collection<CandidateDocument>('candidates');
}

export async function getCountersCollection(): Promise<Collection<CounterDocument>> {
  const db = await getDb();
  return db.collection<CounterDocument>('counters');
}

export async function getModulesCollection(): Promise<Collection<PlatformModule>> {
  const db = await getDb();
  return db.collection<PlatformModule>('modules');
}

export async function getDropdownsCollection(): Promise<Collection<DropdownDocument>> {
  const db = await getDb();
  return db.collection<DropdownDocument>('dropdowns');
}

export async function getAuditLogsCollection(): Promise<Collection<AuditLogDocument>> {
  const db = await getDb();
  return db.collection<AuditLogDocument>('audit_logs');
}

export async function getDocumentsCollection(): Promise<Collection<DocumentMetadataDocument>> {
  const db = await getDb();
  return db.collection<DocumentMetadataDocument>('documents');
}

export async function getEmployeesCollection(): Promise<Collection<EmployeeDocument>> {
  const db = await getDb();
  return db.collection<EmployeeDocument>('employees');
}

export async function getInterviewsCollection(): Promise<Collection<InterviewEventDocument>> {
  const db = await getDb();
  return db.collection<InterviewEventDocument>('interviews');
}

export async function getSettingsCollection(): Promise<Collection<SettingsDocument>> {
  const db = await getDb();
  return db.collection<SettingsDocument>('settings');
}

