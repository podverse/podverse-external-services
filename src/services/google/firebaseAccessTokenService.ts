import * as admin from 'firebase-admin';
import * as fs from 'fs';

export interface FirebaseAccessTokenServiceParams {
  keyFilePath: string;
}

export class FirebaseAccessTokenService {
  private serviceAccount: any;

  constructor({ keyFilePath }: FirebaseAccessTokenServiceParams) {
    if (!keyFilePath) {
      throw new Error('keyFilePath is required');
    }
    this.serviceAccount = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(this.serviceAccount),
      });
    }
  }

  async generateAccessToken(): Promise<string> {
    const token = await admin.credential.cert(this.serviceAccount).getAccessToken();
    return token.access_token;
  }
}
