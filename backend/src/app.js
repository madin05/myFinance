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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(cookieParser());
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

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/savings', savingRoutes);
app.use('/api/accounts', accountRoutes);

module.exports = app;
