import * as admin from 'firebase-admin';
import { config } from '@external-services/config';
const fs = require('fs');

const keyFilePath = config.google.firebase.patoToAuthJson;

let serviceAccount: any = null

if (keyFilePath) {
  serviceAccount = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function firebaseGenerateAccessToken() {
  const token = await admin.credential.cert(serviceAccount).getAccessToken();
  return token.access_token;
}
