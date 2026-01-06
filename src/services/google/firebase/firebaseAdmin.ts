import admin from "firebase-admin";
import { config } from "../../../config";

let firebaseAdminLocal: typeof admin | null = null;

if (!config.google.firebase.notifications_enabled) {
  console.warn("Firebase notifications are disabled in the configuration.");
} else {
  console.log("Firebase notifications are enabled in the configuration.");

  try {
    const settings = require(config.google.firebase.admin_json_key_path);

    const serviceAccount = settings as admin.ServiceAccount;

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin Initialized Successfully");
    }

    firebaseAdminLocal = admin;
  } catch (error) {
    console.error("Firebase Admin Initialization Failed:", error);
    firebaseAdminLocal = null;
  }
}

export const firebaseAdmin = firebaseAdminLocal;
