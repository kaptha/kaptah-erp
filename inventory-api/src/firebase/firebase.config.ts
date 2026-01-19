import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import * as path from 'path';

const serviceAccountPath = path.join(process.cwd(), 'config', 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as ServiceAccount),
    });
  }
}

initializeFirebaseAdmin();

export default admin;