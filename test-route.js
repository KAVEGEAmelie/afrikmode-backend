const express = require('express');
const router = express.Router();

console.log('Test simple de route...');

router.get('/test', (req, res) => {
  res.json({ message: 'Test OK' });
});

console.log('Route simple créée avec succès');

module.exports = router;