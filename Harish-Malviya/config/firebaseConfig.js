const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // Also load root if any

let admin = require('firebase-admin');
if (admin.default) {
  admin = admin.default;
}

function initializeFirebase() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // 1. Raw JSON string or base64 from environment variable (Best for Render deployment)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      let rawConfig = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      // Check if base64 encoded
      if (!rawConfig.startsWith('{') && !rawConfig.startsWith('[')) {
        rawConfig = Buffer.from(rawConfig, 'base64').toString('utf8');
      }
      const serviceAccount = JSON.parse(rawConfig);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (err) {
      console.warn('Warning: Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', err.message);
    }
  }

  // 2. Individual environment variables (Render-friendly alternative)
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        })
      });
    } catch (err) {
      console.warn('Warning: Failed to initialize with individual Firebase env vars:', err.message);
    }
  }

  // 3. Local serviceAccountKey.json file
  const candidatePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.resolve(__dirname, 'serviceAccountKey.json'),
    path.resolve(__dirname, '../serviceAccountKey.json'),
    path.resolve(__dirname, '../../serviceAccountKey.json'),
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
    path.resolve(process.cwd(), 'config/serviceAccountKey.json'),
    path.resolve(process.cwd(), 'Harish Malviya 150096725162/serviceAccountKey.json')
  ].filter(Boolean);

  for (const filePath of candidatePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } catch (err) {
        console.warn(`Warning: Could not load service account from ${filePath}:`, err.message);
      }
    }
  }

  // 4. Fallback to Google Application Default Credentials
  try {
    return admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  } catch (err) {
    console.error('CRITICAL: Firebase Admin failed to initialize:', err.message);
    throw err;
  }
}

const app = initializeFirebase();
const db = admin.firestore();

// Ensure settings if needed
db.settings({ ignoreUndefinedProperties: true });

module.exports = {
  admin,
  db
};
