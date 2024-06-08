const express = require('express');
const router = express.Router();
const { db, storage } = require('../db');
const { authenticate } = require('../middlewares/authenticate');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

// Set up multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

router.post('/detect-expression', authenticate, upload.single('image'), async (req, res) => {
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

      // Download image from Cloud Storage into a buffer
      const [fileBuffer] = await file.download();

      // Prepare form data to send to Flask server
      const form = new FormData();
      form.append('image', fileBuffer, {
        filename: imageFileName,
        contentType: imageFile.mimetype,
      });
      form.append('prediction_type', 'expression');

      // Call Flask server for prediction
      const flaskResponse = await axios.post('http://localhost:3000/predict-expression', form, {
        headers: form.getHeaders(),
      });

      const detectedExpression = flaskResponse.data.prediction;

      // Save detection data to Firestore
      const docRef = db.collection('detectionHistory').doc();
      await docRef.set({
        detectionId: docRef.id,
        userId,
        detectionType: 'expression',
        timestamp: timestamp || new Date().toISOString(),
        data: {
          imageUrl,
          detectedExpression,
        },
      });

      res.status(200).json({ detectedExpression });
    });

    // Send file data to Cloud Storage
    fileStream.end(imageFile.buffer);
  } catch (error) {
    console.error('Error saving detection:', error);
    res.status(500).json({ error: 'Unable to save detection' });
  }
});

module.exports = router;
