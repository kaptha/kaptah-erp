import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';

function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    // Usar variables de entorno en lugar de archivo JSON
    const serviceAccount: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

initializeFirebaseAdmin();

export default admin;
