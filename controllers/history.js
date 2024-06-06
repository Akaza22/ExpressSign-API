const db = require('../db');

exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.uid; // Asumsikan pengguna telah diautentikasi dan user ID tersedia di req.user.uid
    const snapshot = await db.collection('detectionHistory').where('userId', '==', userId).get();
    if (snapshot.empty) {
      return res.status(404).send('No matching documents.');
    }

    let history = [];
    snapshot.forEach(doc => {
      history.push(doc.data());
    });

    res.status(200).json(history);
  } catch (error) {
    console.error('Error getting documents', error);
    res.status(500).send('Internal Server Error');
  }
};