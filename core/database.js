import admin from "firebase-admin"; 

//var serviceAccount = require(path.join(__dirname, "partygolflite-firebase-adminsdk-dfc3p-8e78d63026.json"));
import serviceAccount from '../carers-care-firebase-adminsdk-sp7cd-1a37ad2d83.js';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  //databaseURL: "https://partygolflite.firebaseio.com"
  databaseURL: "https://carers-care.firebaseio.com"
});

export const db = admin.firestore(); 
export const guildsCollection = db.collection("guilds");