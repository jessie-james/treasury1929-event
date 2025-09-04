import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs-extra';

// Configuration
const MAX_IMAGE_SIZE_MB = parseInt(process.env.UPLOAD_MAX_IMAGE_MB || '8');
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

// Multer configuration for memory storage
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIMES.join(', ')}`));
    }
  },
});

interface SaveImageOptions {
  buffer: Buffer;
  subdir: 'artists' | 'menu';
  id: string | number;
}

interface SaveImageResult {
  photoUrl: string;
  thumbUrl: string;
}

/**
 * Save an image with Sharp processing
 * Creates both full-size and thumbnail versions
 */
export async function saveImage({ buffer, subdir, id }: SaveImageOptions): Promise<SaveImageResult> {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const targetDir = path.join(uploadsDir, subdir, String(id));
  
  // Ensure directory exists
  await fs.ensureDir(targetDir);
  
  const photoPath = path.join(targetDir, 'photo.webp');
  const thumbPath = path.join(targetDir, 'thumb.webp');
  
  try {
    // Process and save full-size image
    await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF
      .resize({ 
        width: 1600, 
        height: 1600, 
        fit: 'inside',
        background: '#fff'
      })
      .webp({ quality: 85 })
      .toFile(photoPath);
    
    // Process and save thumbnail
    await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF
      .resize({ 
        width: 400, 
        height: 400, 
        fit: 'inside',
        background: '#fff'
      })
      .webp({ quality: 85 })
      .toFile(thumbPath);
    
    return {
      photoUrl: `/uploads/${subdir}/${id}/photo.webp`,
      thumbUrl: `/uploads/${subdir}/${id}/thumb.webp`
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('Failed to process image');
  }
}

/**
 * Remove all images for a given directory
 */
export async function removeImages(subdir: string, id: string | number): Promise<void> {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const targetDir = path.join(uploadsDir, subdir, String(id));
  
  try {
    // Check if directory exists before trying to remove
    if (await fs.pathExists(targetDir)) {
      await fs.remove(targetDir);
    }
  } catch (error) {
    console.error('Error removing images:', error);
    throw new Error('Failed to remove images');
  }
}

/**
 * Validate if a file is a valid image
 */
export function validateImageFile(file: Express.Multer.File): void {
  if (!file) {
    throw new Error('No file provided');
  }
  
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    throw new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIMES.join(', ')}`);
  }
  
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum allowed: ${MAX_IMAGE_SIZE_MB}MB`);
  }
}