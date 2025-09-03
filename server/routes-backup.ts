// PHASE 3: Backup system with cron jobs
import express from 'express';
import { storage } from './storage';
import * as cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const router = express.Router();

// Backup configuration
const BACKUP_CONFIG = {
  retentionDays: 7, // Keep backups for 7 days
  backupSchedule: '0 2 * * *', // Daily at 2 AM Phoenix time
  backupPath: '/tmp/backups',
  maxBackups: 10, // Maximum number of backups to keep
};

// Ensure backup directory exists
async function ensureBackupDirectory() {
  try {
    await fs.mkdir(BACKUP_CONFIG.backupPath, { recursive: true });
  } catch (error) {
    console.error('Failed to create backup directory:', error);
  }
}

// Generate backup filename
function generateBackupFilename(date: Date = new Date()): string {
  const timestamp = date.toISOString().slice(0, 19).replace(/[:.]/g, '-');
  return `treasury-backup-${timestamp}.sql`;
}

// Perform database backup
async function performBackup(): Promise<{ success: boolean; filename?: string; error?: string }> {
  try {
    await ensureBackupDirectory();
    
    const filename = generateBackupFilename();
    const filepath = path.join(BACKUP_CONFIG.backupPath, filename);
    
    // Use pg_dump to create database backup
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found');
    }
    
    const command = `pg_dump "${databaseUrl}" > "${filepath}"`;
    
    console.log(`[BACKUP] Starting backup: ${filename}`);
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('WARNING')) {
      throw new Error(`pg_dump error: ${stderr}`);
    }
    
    // Verify backup file exists and has content
    const stats = await fs.stat(filepath);
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }
    
    console.log(`[BACKUP] Completed: ${filename} (${Math.round(stats.size / 1024)}KB)`);
    
    // Clean up old backups
    await cleanupOldBackups();
    
    return { success: true, filename };
    
  } catch (error) {
    console.error('[BACKUP] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Clean up old backups based on retention policy
async function cleanupOldBackups(): Promise<void> {
  try {
    const files = await fs.readdir(BACKUP_CONFIG.backupPath);
    const backupFiles = files
      .filter(file => file.startsWith('treasury-backup-') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_CONFIG.backupPath, file)
      }));
    
    // Sort by creation time (newest first)
    const filesWithStats = await Promise.all(
      backupFiles.map(async file => {
        const stats = await fs.stat(file.path);
        return { ...file, mtime: stats.mtime };
      })
    );
    
    filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    
    // Delete old files beyond retention limit
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - BACKUP_CONFIG.retentionDays);
    
    let deletedCount = 0;
    for (const file of filesWithStats) {
      const shouldDelete = 
        file.mtime < cutoffDate || 
        filesWithStats.indexOf(file) >= BACKUP_CONFIG.maxBackups;
        
      if (shouldDelete) {
        try {
          await fs.unlink(file.path);
          console.log(`[BACKUP] Deleted old backup: ${file.name}`);
          deletedCount++;
        } catch (error) {
          console.error(`[BACKUP] Failed to delete ${file.name}:`, error);
        }
      }
    }
    
    if (deletedCount > 0) {
      console.log(`[BACKUP] Cleaned up ${deletedCount} old backup(s)`);
    }
    
  } catch (error) {
    console.error('[BACKUP] Cleanup error:', error);
  }
}

// List available backups
async function listBackups(): Promise<Array<{
  filename: string;
  size: number;
  date: Date;
  age: string;
}>> {
  try {
    await ensureBackupDirectory();
    
    const files = await fs.readdir(BACKUP_CONFIG.backupPath);
    const backupFiles = files.filter(file => 
      file.startsWith('treasury-backup-') && file.endsWith('.sql')
    );
    
    const backups = await Promise.all(
      backupFiles.map(async filename => {
        const filepath = path.join(BACKUP_CONFIG.backupPath, filename);
        const stats = await fs.stat(filepath);
        
        const now = new Date();
        const ageMs = now.getTime() - stats.mtime.getTime();
        const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
        const ageHours = Math.floor((ageMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        let age: string;
        if (ageDays > 0) {
          age = `${ageDays}d ${ageHours}h ago`;
        } else if (ageHours > 0) {
          age = `${ageHours}h ago`;
        } else {
          const ageMinutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));
          age = `${ageMinutes}m ago`;
        }
        
        return {
          filename,
          size: stats.size,
          date: stats.mtime,
          age
        };
      })
    );
    
    // Sort by date (newest first)
    return backups.sort((a, b) => b.date.getTime() - a.date.getTime());
    
  } catch (error) {
    console.error('[BACKUP] List error:', error);
    return [];
  }
}

// API Routes

/**
 * GET /api/backup/status
 * Get backup system status and recent backups
 */
router.get('/status', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const backups = await listBackups();
    
    res.json({
      enabled: true,
      schedule: BACKUP_CONFIG.backupSchedule,
      retentionDays: BACKUP_CONFIG.retentionDays,
      maxBackups: BACKUP_CONFIG.maxBackups,
      backupPath: BACKUP_CONFIG.backupPath,
      totalBackups: backups.length,
      recentBackups: backups.slice(0, 5), // Show 5 most recent
      lastBackup: backups.length > 0 ? backups[0] : null
    });
    
  } catch (error) {
    console.error('Error getting backup status:', error);
    res.status(500).json({ error: 'Failed to get backup status' });
  }
});

/**
 * POST /api/backup/create
 * Manually trigger a backup
 */
router.post('/create', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const result = await performBackup();
    
    if (result.success) {
      res.json({
        success: true,
        filename: result.filename,
        message: 'Backup created successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Backup failed'
      });
    }
    
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

/**
 * GET /api/backup/list
 * List all available backups
 */
router.get('/list', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const backups = await listBackups();
    
    res.json({
      backups,
      total: backups.length
    });
    
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

/**
 * DELETE /api/backup/:filename
 * Delete a specific backup file
 */
router.delete('/:filename', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { filename } = req.params;
    
    // Validate filename
    if (!filename || !filename.startsWith('treasury-backup-') || !filename.endsWith('.sql')) {
      return res.status(400).json({ error: 'Invalid backup filename' });
    }
    
    const filepath = path.join(BACKUP_CONFIG.backupPath, filename);
    
    try {
      await fs.unlink(filepath);
      res.json({
        success: true,
        message: `Backup ${filename} deleted successfully`
      });
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return res.status(404).json({ error: 'Backup file not found' });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

// Initialize backup cron job
export function initializeBackupScheduler() {
  console.log(`[BACKUP] Initializing backup scheduler: ${BACKUP_CONFIG.backupSchedule}`);
  
  // Schedule automated backups
  cron.schedule(BACKUP_CONFIG.backupSchedule, async () => {
    console.log('[BACKUP] Scheduled backup starting...');
    await performBackup();
  }, {
    timezone: 'America/Phoenix'
  });
  
  console.log('[BACKUP] Backup scheduler initialized successfully');
}

export default router;