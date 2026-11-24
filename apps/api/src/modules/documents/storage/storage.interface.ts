import { Readable } from 'stream';

export interface StorageUploadResult {
  storageKey: string;
  bytesWritten: number;
}

export interface StorageService {
  upload(
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string,
  ): Promise<StorageUploadResult>;
  download(storageKey: string): Promise<Buffer>;
  getStream(storageKey: string): Promise<Readable>;
  delete(storageKey: string): Promise<boolean>;
  exists(storageKey: string): Promise<boolean>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
