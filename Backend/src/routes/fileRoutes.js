import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import stream from 'stream';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pipeline = promisify(stream.pipeline);

const router = express.Router();
const UPLOAD_PATH = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads');
const CDN_URL = process.env.CDN_URL || null;

// Enhanced file serving with CDN support and streaming
router.get('/serve/:folder/:year/:month/:filename', async (req, res) => {
  try {
    const { folder, year, month, filename } = req.params;
    
    // If CDN is configured, redirect to CDN
    if (CDN_URL) {
      const cdnUrl = `${CDN_URL}/${folder}/${year}/${month}/${filename}`;
      return res.redirect(302, cdnUrl);
    }
    
    const filePath = path.join(UPLOAD_PATH, folder, year, month, filename);
    
    // Security check - ensure file is within upload directory
    const resolvedPath = path.resolve(filePath);
    const uploadDir = path.resolve(UPLOAD_PATH);
    if (!resolvedPath.startsWith(uploadDir)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    const stat = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    // MIME type mapping
    const mimeTypes = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
      '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip', '.rar': 'application/x-rar-compressed'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // Handle range requests for large files
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = (end - start) + 1;
      
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunksize);
      res.setHeader('Content-Type', contentType);
      
      const stream = fs.createReadStream(filePath, { start, end });
      await pipeline(stream, res);
    } else {
      // Standard file serving with caching
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
      res.setHeader('ETag', `"${stat.mtime.getTime()}-${stat.size}"`);
      
      // Check if client has cached version
      const ifNoneMatch = req.headers['if-none-match'];
      const etag = `"${stat.mtime.getTime()}-${stat.size}"`;
      if (ifNoneMatch === etag) {
        return res.status(304).end();
      }
      
      const stream = fs.createReadStream(filePath);
      await pipeline(stream, res);
    }
    
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ success: false, message: 'Error serving file' });
  }
});

// Legacy route support
router.get('/render/:folder/:filename', (req, res) => {
  const { folder, filename } = req.params;
  // Try to find file in current year/month structure
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  
  res.redirect(`/api/files/serve/${folder}/${year}/${month}/${filename}`);
});

// File metadata and info
router.get('/info/:folder/:year/:month/:filename', (req, res) => {
  try {
    const { folder, year, month, filename } = req.params;
    const filePath = path.join(UPLOAD_PATH, folder, year, month, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    const stat = fs.statSync(filePath);
    const ext = path.extname(filename);
    
    // Generate file hash for integrity check
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    
    res.json({
      success: true,
      data: {
        filename,
        originalPath: `${folder}/${year}/${month}/${filename}`,
        size: stat.size,
        sizeFormatted: formatFileSize(stat.size),
        extension: ext,
        hash,
        created: stat.birthtime,
        modified: stat.mtime,
        url: CDN_URL ? `${CDN_URL}/${folder}/${year}/${month}/${filename}` : `/api/files/serve/${folder}/${year}/${month}/${filename}`
      }
    });
    
  } catch (error) {
    console.error('Error getting file info:', error);
    res.status(500).json({ success: false, message: 'Error getting file info' });
  }
});

// File upload endpoint with chunked upload support
router.post('/upload/chunk', (req, res) => {
  const { chunkIndex, totalChunks, filename, fileId } = req.body;
  const chunk = req.files?.chunk;
  
  if (!chunk) {
    return res.status(400).json({ success: false, message: 'No chunk provided' });
  }
  
  const tempDir = path.join(UPLOAD_PATH, 'temp', fileId);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const chunkPath = path.join(tempDir, `chunk-${chunkIndex}`);
  
  chunk.mv(chunkPath, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to save chunk' });
    }
    
    // Check if all chunks are uploaded
    const uploadedChunks = fs.readdirSync(tempDir).length;
    
    if (uploadedChunks === parseInt(totalChunks)) {
      // Combine chunks
      combineChunks(tempDir, filename, totalChunks)
        .then(finalPath => {
          res.json({ success: true, path: finalPath, completed: true });
        })
        .catch(error => {
          res.status(500).json({ success: false, message: 'Failed to combine chunks' });
        });
    } else {
      res.json({ success: true, completed: false, uploadedChunks });
    }
  });
});

// Storage usage statistics
router.get('/stats', (req, res) => {
  try {
    const stats = getStorageStats(UPLOAD_PATH);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error getting storage stats' });
  }
});

// Helper functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function combineChunks(tempDir, filename, totalChunks) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const finalDir = path.join(UPLOAD_PATH, 'documents', year.toString(), month);
  
  if (!fs.existsSync(finalDir)) {
    fs.mkdirSync(finalDir, { recursive: true });
  }
  
  const finalPath = path.join(finalDir, filename);
  const writeStream = fs.createWriteStream(finalPath);
  
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(tempDir, `chunk-${i}`);
    const chunkBuffer = fs.readFileSync(chunkPath);
    writeStream.write(chunkBuffer);
  }
  
  writeStream.end();
  
  // Cleanup temp directory
  fs.rmSync(tempDir, { recursive: true });
  
  return `documents/${year}/${month}/${filename}`;
}

function getStorageStats(uploadPath) {
  let totalSize = 0;
  let fileCount = 0;
  
  function scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        scanDirectory(itemPath);
      } else {
        totalSize += stat.size;
        fileCount++;
      }
    });
  }
  
  if (fs.existsSync(uploadPath)) {
    scanDirectory(uploadPath);
  }
  
  return {
    totalSize,
    totalSizeFormatted: formatFileSize(totalSize),
    fileCount,
    averageFileSize: fileCount > 0 ? Math.round(totalSize / fileCount) : 0
  };
}

export default router;