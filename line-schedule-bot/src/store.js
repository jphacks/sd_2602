import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { emptyState } from './domain.js';

/** Single-process local test repository. Production Base44 adapter is not implemented. */
export class FileStore {
  constructor(filename) {
    this.filename = resolve(filename);
    try { this.state = JSON.parse(readFileSync(this.filename, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      this.state = emptyState();
    }
    if (this.state.schemaVersion !== 1) throw new Error('Unsupported state version');
  }
  transaction(fn) {
    const next = structuredClone(this.state);
    const result = fn(next);
    if (result?.then) throw new Error('Transactions must be synchronous');
    mkdirSync(dirname(this.filename), { recursive: true });
    const temp = `${this.filename}.tmp`;
    writeFileSync(temp, JSON.stringify(next), { mode: 0o600 });
    renameSync(temp, this.filename);
    this.state = next;
    return result;
  }
}
