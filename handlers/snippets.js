const { db } = require('../util/admin');

// Get all snippets
exports.getAllSnippets = (req, res) => {
  db.collection('snippets')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let snippets = [];
      data.forEach((doc) => {
        snippets.push({
          snippetId: doc.id,
          body: doc.data().body,
          audio: doc.data().audio,
          genre: doc.data().genre,
          playCount: doc.data().playCount,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage
        });
      });
      return res.json(snippets);
    })
    .catch((err) => console.error(err));
};

// Get snippets with pagination first query
exports.getSnippetsFirst = async (req, res) => {
  let lastSnippet;
  await db.collection('snippets')
    .orderBy('createdAt', 'asc')
    .limit(1)
    .get()
    .then((data) => { 
      lastSnippet = data.docs[data.docs.length-1]
     });
  db.collection('snippets')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get()
    .then((data) => {
      let snippets = [];
      let lastVisible = data.docs[data.docs.length-1];
      data.forEach((doc) => {
        snippets.push({
          snippetId: doc.id,
          body: doc.data().body,
          audio: doc.data().audio,
          genre: doc.data().genre,
          playCount: doc.data().playCount,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage
        });
      });
      return res.json({snippets, lastVisible, lastSnippet});
    })
    .catch((err) => console.error(err));
};

// Get snippets with pagination subsequent query
exports.getSnippetsNext = (req, res) => {
  db.collection('snippets')
    .orderBy('createdAt', 'desc')
    .startAfter(req.body._fieldsProto.createdAt.stringValue)
    .limit(5)
    .get()
    .then((data) => {
      let lastVisible = data.docs[data.docs.length-1];
      let snippets = [];
      data.forEach((doc) => {
        snippets.push({
          snippetId: doc.id,
          body: doc.data().body,
          audio: doc.data().audio,
          genre: doc.data().genre,
          playCount: doc.data().playCount,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage
        });
      });
      return res.json({snippets, lastVisible});
    })
    .catch((err) => console.error(err));
};

// Get snippets by genre with pagination first query
exports.getSnippetsByGenre = async (req, res) => {
  let lastSnippet;
  await db.collection('snippets')
    .where('genre', '==', req.params.genre)
    .orderBy('createdAt', 'asc')
    .limit(1)
    .get()
    .then((data) => { 
      lastSnippet = data.docs[data.docs.length-1]
     });
  db.collection('snippets')
    .where('genre', '==', req.params.genre)
    .orderBy('createdAt', 'desc')
    .limit(3)
    .get()
    .then((data) => {
      let snippets = [];
      let lastVisible = data.docs[data.docs.length-1];
      data.forEach((doc) => {
        snippets.push({
          snippetId: doc.id,
          body: doc.data().body,
          audio: doc.data().audio,
          genre: doc.data().genre,
          playCount: doc.data().playCount,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage
        });
      });
      return res.json({snippets, lastVisible, lastSnippet});
    })
    .catch((err) => console.error(err));
};

// Get snippets by genre with pagination subsequent query
exports.getSnippetsByGenreNext = (req, res) => {
  db.collection('snippets')
    .where('genre', '==', req.params.genre)
    .orderBy('createdAt', 'desc')
    .startAfter(req.body._fieldsProto.createdAt.stringValue)
    .limit(3)
    .get()
    .then((data) => {
      let lastVisible = data.docs[data.docs.length-1];
      let snippets = [];
      data.forEach((doc) => {
        snippets.push({
          snippetId: doc.id,
          body: doc.data().body,
          audio: doc.data().audio,
          genre: doc.data().genre,
          playCount: doc.data().playCount,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage
        });
      });
      return res.json({snippets, lastVisible});
    })
    .catch((err) => console.error(err));
};

// Get one snippet
exports.getSnippet = (req, res) => {
  let snippetData = {};
  db.doc(`/snippets/${req.params.snippetId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Snippet not found' });
      }
      snippetData = doc.data();
      snippetData.snippetId = doc.id;
      return db
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .where('snippetId', '==', req.params.snippetId)
        .get();
    })
    .then((data) => {
      snippetData.comments = [];
      data.forEach((doc) => {
        snippetData.comments.push(doc.data());
      });
      return res.json(snippetData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Post one snippet
exports.postOneSnippet = (req, res) => {
  if (req.body.body.trim() === '') {
    return res.status(400).json({ error: 'Please write a short message' });  
  }

  if (!req.body.audio) {
    return res.status(400).json({ error: 'Please upload your audio' });
  }

  const newSnippet = {
    body: req.body.body,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    audio: req.body.audio,
    genre: req.body.genre,
    playCount: 0,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0
  };

  db.collection('snippets')
    .add(newSnippet)
    .then((doc) => {
      const resSnippet = newSnippet;
      resSnippet.snippetId = doc.id;
      res.json(resSnippet);
    })
    .catch((err) => {
      res.status(500).json({ error: 'Something went wrong' });
      console.error(err);
    });
};

// Comment on a snippet
exports.commentOnSnippet = (req, res) => {
  if(req.body.body.trim() === '') return res.status(400).json({ comment: 'Must not be empty'});

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    snippetId: req.params.snippetId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl
  }

  db.doc(`/snippets/${req.params.snippetId}`).get()
    .then(doc =>{
      if(!doc.exists){
        return res.status(404).json({ error: 'Snippet not found' });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1});
    })
    .then(() => {
      return db.collection('comments').add(newComment); 
    })
    .then(() => {
      res.json(newComment);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: 'Something went wrong' });
    });
};

// Like a snippet
exports.likeSnippet = (req, res) => {
  const likeDocument = db.collection('likes')
  .where('userHandle', '==', req.user.handle)
  .where('snippetId', '==', req.params.snippetId).limit(1);
  
  const snippetDocument = db.doc(`/snippets/${req.params.snippetId}`);

  let snippetData;

  snippetDocument.get()
    .then(doc => {
      if(doc.exists){
        snippetData = doc.data();
        snippetData.snippetId = doc.id;
        return likeDocument.get(); 
      } else {
        return res.status(404).json({ error: 'Snippet not found'});
      }
    })
    .then(data => {
      if(data.empty){
        return db.collection('likes').add({
          snippetId: req.params.snippetId,
          userHandle: req.user.handle,
          createdAt: new Date().toISOString()
        })
        .then(() => {
          snippetData.likeCount++
          return snippetDocument.update({ likeCount: snippetData.likeCount });
        })
        .then(() => {
          return res.json(snippetData);
        })
      } else {
        return res.status(400).json({ error: 'Snippet already liked'});
      }
    })
    .catch(err => {
      console.log(error);
      res.status(500).json({ err: error.code })
    });
};

// Unlike a snippet
exports.unlikeSnippet = (req, res) => {
  const likeDocument = db.collection('likes')
  .where('userHandle', '==', req.user.handle)
  .where('snippetId', '==', req.params.snippetId).limit(1);
  
  const snippetDocument = db.doc(`/snippets/${req.params.snippetId}`);

  let snippetData;

  snippetDocument.get()
    .then(doc => {
      if(doc.exists){
        snippetData = doc.data();
        snippetData.snippetId = doc.id;
        return likeDocument.get(); 
      } else {
        return res.status(404).json({ error: 'Snippet not found'});
      }
    })
    .then(data => {
      if(data.empty){
        return res.status(400).json({ error: 'Snippet not liked'});
      } else {
        return db.doc(`/likes/${data.docs[0].id}`).delete()
          .then(() => {
            snippetData.likeCount--;
            return snippetDocument.update({ likeCount: snippetData.likeCount });
          })
          .then(() => {
            res.json(snippetData);
          })
      }
    })
    .catch(err => {
      console.log(error);
      res.status(500).json({ err: error.code })
    });
};

// Play a snippet (Logged user)
exports.playSnippetLogged = (req, res) => {
  const playDocument = db.collection('plays')
  .where('userHandle', '==', req.user.handle)
  .where('snippetId', '==', req.params.snippetId).limit(1);
  
  const snippetDocument = db.doc(`/snippets/${req.params.snippetId}`);

  let snippetData;

  snippetDocument.get()
    .then(doc => {
      if(doc.exists){
        snippetData = doc.data();
        snippetData.snippetId = doc.id;
        return playDocument.get(); 
      } else {
        return res.status(404).json({ error: 'Snippet not found'});
      }
    })
    .then(data => {
      if(data.empty){
        return db.collection('plays').add({
          snippetId: req.params.snippetId,
          userHandle: req.user.handle,
          createdAt: new Date().toISOString()
        })
        .then(() => {
          snippetData.playCount++
          return snippetDocument.update({ playCount: snippetData.playCount });
        })
        .then(() => {
          return res.json(snippetData);
        })
      } else {
        return res.status(400).json({ error: 'Snippet already played'});
      }
    })
    .catch(err => {
      console.log(error);
      res.status(500).json({ err: error.code })
    });
};

// Play a snippet (Not logged user)
exports.playSnippetNotLogged = (req, res) => {
  const snippetDocument = db.doc(`/snippets/${req.params.snippetId}`);

  let snippetData;

  snippetDocument.get()
    .then(doc => {
      if(doc.exists){
        snippetData = doc.data();
        snippetData.snippetId = doc.id;
        snippetData.playCount++;
        snippetDocument.update({ playCount: snippetData.playCount });
        return res.json(snippetData);
      } else {
        return res.status(404).json({ error: 'Snippet not found'});
      }
    })
    .catch(err => {
      console.log(error);
      res.status(500).json({ err: error.code })
    });
};

// Delete a snippet
exports.deleteSnippet = (req, res) => {
  const document = db.doc(`/snippets/${req.params.snippetId}`);
  document.get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Snippet not found'});
      } else if(doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: 'Unathorized'});
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: 'Snippet deleted succesfully'});
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
