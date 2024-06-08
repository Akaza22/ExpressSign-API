const express = require('express');
const router = express.Router();
const { db, storage } = require('../db');
const { authenticate } = require('../middlewares/authenticate');

router.delete('/delete-detection/:id', authenticate, async (req, res) => {
  const detectionId = req.params.id;
  const userId = req.user.uid;

  try {
    const detectionRef = db.collection('detectionHistory').doc(detectionId);
    const detection = await detectionRef.get();

    if (!detection.exists) {
      return res.status(404).send({ error: 'Detection not found' });
    }

    if (detection.data().userId !== userId) {
      return res.status(403).send({ error: 'Unauthorized to delete this detection' });
    }

    // Get the image URL from the detection data
    const imageUrl = detection.data().data.imageUrl;

    // Extract the file name from the imageUrl
    const fileName = imageUrl.split('/').pop();

    // Delete the image from Cloud Storage
    const bucket = storage.bucket();
    const file = bucket.file(fileName);

    await file.delete();

    // Delete the detection record from Firestore
    await detectionRef.delete();

    res.status(200).send({ message: 'Detection deleted successfully' });
  } catch (error) {
    console.error('Error deleting detection:', error);
    res.status(500).send({ error: 'Unable to delete detection' });
  }
});

module.exports = router;
