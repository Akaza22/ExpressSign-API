const admin = require('firebase-admin');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ error: 'Authorization header is missing' });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    return res.status(401).send({ error: 'Bearer token is missing' });
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying ID token:', error);
    res.status(401).send({ error: 'Invalid ID token' });
  }
}

module.exports = { authenticate };