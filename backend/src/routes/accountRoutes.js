const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  syncAccounts
} = require('../controllers/accountController');

router.use(authMiddleware);

router.get('/', getAccounts);
router.post('/', createAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);
router.post('/sync', syncAccounts);

module.exports = router;
