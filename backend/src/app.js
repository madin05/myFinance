const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '2mb' })); // Turunin ke 2MB biar gak kegedean
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use(morgan('dev'));

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to MyFinance API (PostgreSQL Edition)' });
});

// Import and use routes
const transactionRoutes = require('./routes/transactionRoutes');
const userRoutes = require('./routes/userRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const savingRoutes = require('./routes/savingRoutes');

app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/savings', savingRoutes);

module.exports = app;
