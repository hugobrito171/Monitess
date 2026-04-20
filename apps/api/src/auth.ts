import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'monitess.config.json');
const JWT_SECRET = process.env.MONITESS_JWT_SECRET || 'monitess-secret-change-me';

interface Config {
  passwordHash: string | null;
  authEnabled: boolean;
}

function loadConfig(): Config {
  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  }
  // Default: use MONITESS_PASSWORD env var if set
  const envPassword = process.env.MONITESS_PASSWORD;
  if (envPassword) {
    const hash = bcrypt.hashSync(envPassword, 10);
    const config: Config = { passwordHash: hash, authEnabled: true };
    saveConfig(config);
    return config;
  }
  return { passwordHash: null, authEnabled: false };
}

function saveConfig(config: Config): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

let cachedConfig: Config = loadConfig();

export function isAuthEnabled(): boolean {
  return cachedConfig.authEnabled;
}

export function verifyPassword(password: string): boolean {
  if (!cachedConfig.passwordHash) return true;
  return bcrypt.compareSync(password, cachedConfig.passwordHash);
}

export function generateToken(): string {
  return jwt.sign({ auth: true }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export function setPassword(newPassword: string): void {
  const hash = bcrypt.hashSync(newPassword, 10);
  cachedConfig = { passwordHash: hash, authEnabled: true };
  saveConfig(cachedConfig);
}

export function disableAuth(): void {
  cachedConfig = { passwordHash: null, authEnabled: false };
  saveConfig(cachedConfig);
}
