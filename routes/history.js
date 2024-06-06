const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticate } = require('../middlewares/authenticate');

router.get('/history', authenticate, async (req, res) => {
  const userId = req.user.uid;

  try {
    const snapshot = await db.collection('detectionHistory').where('userId', '==', userId).get();
    if (snapshot.empty) {
      res.status(404).send({ error: 'No detection history found' });
      return;
    }

    const history = [];
    snapshot.forEach(doc => {
      history.push(doc.data());
    });

    res.status(200).send(history);
  } catch (error) {
    console.error('Error fetching detection history:', error);
    res.status(500).send({ error: 'Unable to fetch detection history' });
  }
});

module.exports = router;
