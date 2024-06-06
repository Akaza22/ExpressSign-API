const admin = require('firebase-admin');
const config = require('./config');

// Load service account key JSON file
const serviceAccount = require('./serviceAccountKey.json');

// Inisialisasi Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: config.firebaseConfig.databaseURL,
  storageBucket: config.firebaseConfig.storageBucket
});

const storage = admin.storage(); 
const db = admin.firestore();
module.exports = { db, storage };
