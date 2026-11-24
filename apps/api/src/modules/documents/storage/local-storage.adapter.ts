import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { StorageService, StorageUploadResult } from './storage.interface';
import { sanitizeFileName } from '@fairtune/shared';

@Injectable()
export class LocalStorageAdapter implements StorageService {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly basePath: string;

  constructor(private readonly configService: ConfigService) {
    const configuredPath =
      this.configService.get<string>('storage.localPath') || './storage/contracts';
    this.basePath = path.resolve(process.cwd(), configuredPath);

    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
      this.logger.log(`Created local storage directory at: ${this.basePath}`);
    }
  }

  private resolveSafePath(storageKey: string): string {
    // Prevent directory traversal
    const safeKey = path.basename(storageKey);
    return path.join(this.basePath, safeKey);
  }

  async upload(
    fileBuffer: Buffer,
    originalFileName: string,
    _mimeType: string,
  ): Promise<StorageUploadResult> {
    const ext = path.extname(sanitizeFileName(originalFileName)) || '.pdf';
    const storageKey = `${randomUUID()}${ext}`;
    const destinationPath = this.resolveSafePath(storageKey);

    await fs.promises.writeFile(destinationPath, fileBuffer);
    return {
      storageKey,
      bytesWritten: fileBuffer.length,
    };
  }

  async download(storageKey: string): Promise<Buffer> {
    const filePath = this.resolveSafePath(storageKey);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at storage key: ${storageKey}`);
    }
    return fs.promises.readFile(filePath);
  }

  async getStream(storageKey: string): Promise<Readable> {
    const filePath = this.resolveSafePath(storageKey);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at storage key: ${storageKey}`);
    }
    return fs.createReadStream(filePath);
  }

  async delete(storageKey: string): Promise<boolean> {
    const filePath = this.resolveSafePath(storageKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  }

  async exists(storageKey: string): Promise<boolean> {
    const filePath = this.resolveSafePath(storageKey);
    return fs.existsSync(filePath);
  }
}
