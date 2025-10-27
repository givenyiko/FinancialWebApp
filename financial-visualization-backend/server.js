import express from 'express';
import multer from 'multer';
import odbc from 'odbc';
import XLSX from 'xlsx';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv'; 

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../financial-visualization-frontend'));

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.endsWith('.xlsx')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// ✅ Database connection using ODBC
const connectionString =
  'Driver={ODBC Driver 17 for SQL Server};Server=DESKTOP-SVEQ3AJ\\SQLEXPRESS;Database=financial_data;Trusted_Connection=Yes;';
let db;

async function connectDB() {
  console.log('Attempting to connect to SQL Server at DESKTOP-SVEQ3AJ\\SQLEXPRESS...');
  try {
    db = await odbc.connect(connectionString);
    console.log('✅ Connected to SQL Server successfully!');
    const version = await db.query('SELECT @@VERSION AS [SQL Server Version]');
    console.log('SQL Server Version:', version[0]['SQL Server Version']);
  } catch (err) {
    console.error('❌ Database connection failed:');
    console.error('Error name:', err.name || 'N/A');
    console.error('Error code:', err.code || 'N/A');
    console.error('Error message:', err.message || 'N/A');
    console.error('Stack:', err.stack || 'N/A');
    throw err;
  }
}

// File Upload Endpoint
app.post('/api/finances/upload/:userId/:year', upload.single('file'), async (req, res) => {
  try {
    const { userId, year } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate user exists
    const users = await db.query(`SELECT * FROM users WHERE user_id = ?`, [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Parse Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' }).map(row => ({
    Month: row['Month']?.trim(),
    Amount: parseFloat(row['Amount'])
   })).filter(row => row.Month && !isNaN(row.Amount));

    if (!data.length || !data[0].Month || !data[0].Amount) {
      return res.status(400).json({ error: 'Invalid Excel format. Required columns: Month, Amount' });
    }

    // Transaction
    await db.query('BEGIN TRANSACTION');

    try {
      await db.query('DELETE FROM financial_records WHERE user_id = ? AND year = ?', [userId, year]);

      for (const row of data) {
        const { Month, Amount } = row;
        if (!Month || Amount === undefined || Amount === null) {
          throw new Error(`Invalid data in row: Month=${Month}, Amount=${Amount}`);
        }

        await db.query(
          'INSERT INTO financial_records (user_id, year, month, amount) VALUES (?, ?, ?, ?)',
          [userId, year, Month, parseFloat(Amount)]
        );
      }

      await db.query('COMMIT');
      fs.unlinkSync(req.file.path);
      res.json({ message: 'File processed successfully', recordsProcessed: data.length });

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process file', details: error.message });
  }
});

// Data Retrieval Endpoint
app.get('/api/finances/:userId/:year', async (req, res) => {
  try {
    const { userId, year } = req.params;

    const records = await db.query(
      `SELECT r.record_id, r.month, r.amount, u.name 
       FROM financial_records r 
       JOIN users u ON r.user_id = u.user_id 
       WHERE r.user_id = ? AND r.year = ? 
       ORDER BY 
         CASE r.month
           WHEN 'January' THEN 1
           WHEN 'February' THEN 2
           WHEN 'March' THEN 3
           WHEN 'April' THEN 4
           WHEN 'May' THEN 5
           WHEN 'June' THEN 6
           WHEN 'July' THEN 7
           WHEN 'August' THEN 8
           WHEN 'September' THEN 9
           WHEN 'October' THEN 10
           WHEN 'November' THEN 11
           WHEN 'December' THEN 12
         END`,
      [userId, year]
    );

    const user = await db.query('SELECT name FROM users WHERE user_id = ?', [userId]);

    res.json({
      user: user[0],
      year: parseInt(year),
      records: records
    });
  } catch (error) {
    console.error('Retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve data' });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../financial-visualization-frontend/index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB' });
  }
  res.status(500).json({ error: error.message });
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('❌ Failed to start server due to DB error');
  process.exit(1);
});
