const { Router } = require('express');
const { authenticate } = require('../middleware');

const router = Router();

router.get('/me', authenticate, (req, res) => {
  res.json({
    user: req.user
  });
});

router.post('/login', (req, res) => {
  res.json({
    token: 'mock-jwt-token-from-api'
  });
});

module.exports = router;
