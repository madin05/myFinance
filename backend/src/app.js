const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const dotenv = require('dotenv');
const compression = require('compression');

dotenv.config();

const app = express();

// ─── Middlewares ────────────────────────────────────────────────────────────

// Gzip semua response JSON - hemat bandwidth hingga 70%
app.use(compression());

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Fallback safe allow in dev
  },
  credentials: true
}));

app.use(cookieParser());

// Body parser khusus untuk /api/receipts (upload base64 image, butuh limit lebih besar)
// HARUS dipasang SEBELUM global JSON parser supaya gak ke-reject duluan oleh limit kecil
app.use('/api/receipts', express.json({ limit: '6mb' }));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// Ganti 'dev' ke 'tiny' di production biar log lebih ringkas & hemat CPU
app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));

// ─── Health Check (buat UptimeRobot ping biar Railway gak tidur) ────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', ts: Date.now() });
});

// ─── Basic Route ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'MyFinance API is running 🚀' });
});

// ─── Routes ─────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const userRoutes = require('./routes/userRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const savingRoutes = require('./routes/savingRoutes');
const accountRoutes = require('./routes/accountRoutes');
const receiptRoutes = require('./routes/receiptRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/savings', savingRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/receipts', receiptRoutes);

module.exports = app;
