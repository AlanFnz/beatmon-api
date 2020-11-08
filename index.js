const functions = require('firebase-functions');
const express = require('express');
const FBAuth = require('./util/fbAuth');
const { db } = require('./util/admin');
const cors = require('cors');

const {
  getAllSnippets,
  getSnippetsFirst,
  getSnippetsNext,
  postOneSnippet,
  getSnippet,
  commentOnSnippet,
  likeSnippet,
  unlikeSnippet,
  deleteSnippet,
  playSnippetLogged,
  playSnippetNotLogged,
} = require('./handlers/snippets');

const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  getUserSnippetsNext,
  markNotificationsRead
} = require('./handlers/users');

const app = express();
app.use(cors());

// Snippet routes
app.get('/snippets', getAllSnippets);
app.post('/snippets/first', getSnippetsFirst);
app.post('/snippets/next', getSnippetsNext);
app.post('/snippet', FBAuth, postOneSnippet);
app.get('/snippet/:snippetId', getSnippet);
app.delete('/snippet/:snippetId', FBAuth, deleteSnippet);
app.get('/snippet/:snippetId/play', FBAuth, playSnippetLogged);
app.get('/snippet/:snippetId/playNotLogged', playSnippetNotLogged);
app.get('/snippet/:snippetId/like', FBAuth, likeSnippet);
app.get('/snippet/:snippetId/unlike', FBAuth, unlikeSnippet);
app.post('/snippet/:snippetId/comment', FBAuth, commentOnSnippet);

// Users routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/user/:handle/next', getUserSnippetsNext);
app.post('/notifications', FBAuth, markNotificationsRead);

exports.api = functions.region('europe-west1').https.onRequest(app);

// Create notification on like
exports.createNotificationOnLike = functions.region('europe-west1').firestore.document('likes/{id}')
.onCreate((snapshot) => {
  return db.doc(`/snippets/${snapshot.data().snippetId}`).get()
    .then(doc => {
      if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
        return db.doc(`/notifications/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: doc.data().userHandle,
          sender: snapshot.data().userHandle,
          type: 'like',
          read: false,
          snippetId: doc.id
        });
      }
    })
    .catch(err => 
      console.error(err));
});

// Delete notification on unlike
exports.deleteNotificationOnUnlike =  functions.region('europe-west1').firestore.document('likes/{id}')
.onDelete((snapshot) => {
  return db.doc(`/notifications/${snapshot.id}`)
    .delete()
    .catch(err => {
      console.error(err);
      return;
    });
});

// Create notification on comment
exports.createNotificationOnComment = functions.region('europe-west1').firestore.document('comments/{id}')
.onCreate((snapshot) => {
  return db.doc(`/snippets/${snapshot.data().snippetId}`).get()
    .then(doc => {
      if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
        return db.doc(`/notifications/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: doc.data().userHandle,
          sender: snapshot.data().userHandle,
          type: 'comment',
          read: false,
          snippetId: doc.id
        });
      }
    })
    .catch(err => {
      console.error(err);
      return;
    });
});

// Update user image on change
exports.onUserImageChange = functions.region('europe-west1').firestore.document('/users/{userId}')
.onUpdate((change) => {
  console.log(change.before.data());
  console.log(change.after.data());
  if(change.before.data().imageUrl !== change.after.data().imageUrl){
    console.log('Image has changed');
    const batch = db.batch();
    return db.collection('snippets').where('userHandle', '==', change.before.data().handle).get()
      .then((data) => {
        data.forEach(doc => {
          const snippet = db.doc(`/snippets/${doc.id}`);
          batch.update(snippet, { userImage: change.after.data().imageUrl});
        })
        return batch.commit();
      });
  } else return true;
});

// Clean on snippet delete
exports.onSnippetDelete = functions.region('europe-west1').firestore.document('snippets/{snippetId}')
.onDelete((snapshot, context) => {
  const snippetId = context.params.snippetId;
  const batch = db.batch();
  return db.collection('comments').where('snippetId', '==', snippetId).get()
    .then(data => {
      data.forEach(doc => {
        batch.delete(db.doc(`/comments/${doc.id}`));
      })
      return db.collection('likes').where('snippetId', '==', snippetId).get()
    })
    .then(data => {
      data.forEach(doc => {
        batch.delete(db.doc(`/likes/${doc.id}`));
      })
      return db.collection('notifications').where('snippetId', '==', snippetId).get()
    })
    .then(data => {
      data.forEach(doc => {
        batch.delete(db.doc(`/notifications/${doc.id}`));
      })
      return batch.commit();
    })
    .catch(err => console.error(err));
})