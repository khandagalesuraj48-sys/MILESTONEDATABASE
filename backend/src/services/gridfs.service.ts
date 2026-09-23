import { ObjectId } from 'mongodb';
import { Readable } from 'stream';
import { getGridFSBucket } from '../config/db';

export async function uploadResumeBuffer(
  buffer: Buffer,
  filename: string,
  contentType: string = 'application/pdf'
): Promise<ObjectId> {
  const bucket = await getGridFSBucket();
  const readableStream = new Readable();
  readableStream.push(buffer);
  readableStream.push(null);

  return new Promise<ObjectId>((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata: {
        uploadedAt: new Date(),
        originalName: filename,
      },
    });

    readableStream
      .pipe(uploadStream)
      .on('error', (err) => reject(err))
      .on('finish', () => resolve(uploadStream.id as ObjectId));
  });
}

export async function getResumeStream(
  fileId: string | ObjectId
): Promise<{ stream: NodeJS.ReadableStream; file: any }> {
  const bucket = await getGridFSBucket();
  const objId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

  const files = await bucket.find({ _id: objId }).toArray();
  if (!files || files.length === 0) {
    throw new Error(`Resume file with ID ${fileId} not found in GridFS`);
  }

  const file = files[0];
  const downloadStream = bucket.openDownloadStream(objId);

  return {
    stream: downloadStream,
    file,
  };
}

export async function deleteResume(fileId: string | ObjectId): Promise<void> {
  try {
    const bucket = await getGridFSBucket();
    const objId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;
    await bucket.delete(objId);
  } catch (err: any) {
    console.warn(`[GridFS] Warning deleting file ${fileId}:`, err.message);
  }
}

