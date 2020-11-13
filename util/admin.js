const admin = require('firebase-admin');

const firebase = admin.initializeApp();

const db = admin.firestore();

module.exports = { admin, db, firebase };