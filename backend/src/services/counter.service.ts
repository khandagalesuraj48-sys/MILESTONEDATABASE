import { getCountersCollection } from '../config/db';

/**
 * Generates an atomic sequential interview ID in format INT-YYYY-0001
 * Uses MongoDB findOneAndUpdate with $inc and upsert for thread-safety and race condition prevention.
 */
export async function getNextInterviewId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const counterId = `interview_id_${currentYear}`;
  const counters = await getCountersCollection();

  const result = await counters.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );

  const seqNumber = result?.seq ?? 1;
  const paddedSeq = String(seqNumber).padStart(4, '0');
  return `INT-${currentYear}-${paddedSeq}`;
}

