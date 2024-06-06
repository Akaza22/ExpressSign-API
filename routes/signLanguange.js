const express = require('express');
const router = express.Router();
const { db, storage } = require('../db');
const { authenticate } = require('../middlewares/authenticate');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

// Set up multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

router.post('/detect-sign-language', authenticate, upload.single('image'), async (req, res) => {
  const userId = req.user.uid;
  const { timestamp } = req.body;

  // Ensure an image file is provided
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }

  const imageFile = req.file;
  const imageFileName = uuidv4() + '-' + imageFile.originalname; // Generate unique file name

  try {
    // Upload image to Cloud Storage
    const bucket = storage.bucket();
    const file = bucket.file(imageFileName);
    const fileStream = file.createWriteStream({
      metadata: {
        contentType: imageFile.mimetype,
      },
    });

    fileStream.on('error', (err) => {
      console.error('Error uploading image:', err);
      res.status(500).json({ error: 'Unable to upload image' });
    });

    fileStream.on('finish', async () => {
      const imageUrl = `https://storage.googleapis.com/${bucket.name}/${imageFileName}`;

      // Dummy response
      const detectedSign = 'B'; 

      // Save detection data to Firestore
      const docRef = db.collection('detectionHistory').doc();
      await docRef.set({
        detectionId: docRef.id,
        userId,
        detectionType: 'sign-language',
        timestamp: timestamp || new Date().toISOString(),
        data: {
          imageUrl,
          detectedSign,
        },
      });

      res.status(200).json({ detectedSign, detectionId: docRef.id });
    });

    // Send file data to Cloud Storage
    fileStream.end(imageFile.buffer);
  } catch (error) {
    console.error('Error saving detection:', error);
    res.status(500).json({ error: 'Unable to save detection' });
  }
});

module.exports = router;
