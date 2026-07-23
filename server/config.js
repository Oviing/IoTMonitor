/**
 * Persistence for connection definitions.
 *
 * Stores an array of connection configs in data/connections.json. Credentials are
 * kept in plaintext for the MVP — the data/ directory is gitignored so secrets are
 * never committed. See README for the security note.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const FILE = join(DATA_DIR, 'connections.json');

/** @returns {Promise<Array<object>>} saved connections (empty array if none) */
export async function loadConnections() {
  try {
    const raw = await readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** @param {Array<object>} connections */
export async function saveConnections(connections) {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(connections, null, 2), 'utf8');
}
