export const config = {
  google: {
    firebase: {
      notifications_enabled: process.env.GOOGLE_FIREBASE_NOTIFICATIONS_ENABLED === "true",
      admin_json_key_path: process.env.GOOGLE_FIREBASE_ADMIN_JSON_KEY_PATH || "",
    }
  },
  web: {
    protocol: process.env.WEB_PROTOCOL || "http",
    host: process.env.WEB_DOMAIN || "localhost",
    icon_image_url: process.env.WEB_ICON_IMAGE_PATH || ""
  }
}
