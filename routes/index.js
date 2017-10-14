var express = require('express');
var idOr404 = require('../middleware/validObjectIdOr404');
var fs = require('fs-extra');

var multer = require('multer');
var upload = multer({ dest : 'public/images'});


var router = express.Router();



/* GET home page, list of all flower documents. */
router.get('/', function(req, res, next) {
  
  // Find all documents, sort by name in ascending order,
  // turn the resulting Cursor into an array.
  
  req.flowers.find({}).sort( {'name': 1} ).toArray()
    .then( (docs) => {
      //console.log(docs);  // Uncomment to see an array of all the documents
      return res.render('all_flowers', { flowers:docs } );
    })
    .catch((err) => {
      return next(err);   // to the 500 error handler
  });
  
});



/* Get all the information about one flower. Note the use of
 * URL parameter - the :_id in the path

  * idOr404.fromParams extracts the Object ID from the request parameters
  * converts it to an ObjectID, and adds it to the request as req._id  */
router.get('/details/:_id', idOr404.fromParams, function(req, res, next){
  
    console.log(req.params);  // { _id : 12345678 }

  req.flowers.findOne({ _id: req._id }).
    then((doc) => {
      console.log('Flower document',  doc);
      if (doc) {
        return res.render('flower_detail', {flower : doc});
      } else {
        res.statusCode = 404;
        return next()
      }
    })
    .catch((err) => {
      return next(err);
    });
  
});


/* POST to add a new flower. */
router.post('/newFlower', function(req, res, next){
  
  console.log(req.body);
  
  // TODO validate: a name and a color, at least
  
  req.flowers.insertOne(req.body)
    .then((results) => {
      console.log('Results from the database:', results);  // Includes the insertedCount and new document
      return res.redirect('/');
    })
    .catch((err) => {
      return next(err);
    });
  
});



/* Update the color of the flower.

* idOr404.fromBody extracts the Object ID from the request body,
* converts it to an ObjectID, and adds it to the request as req._id  */

router.post('/setColor', idOr404.fromBody, function(req, res, next){
  
  console.log('update color', req.body);
  
  // TODO validate: a color is provided...
  // TODO if no color provided, do not modify
  
  // Use $set parameter to specify what will be updated
  req.flowers.findOneAndUpdate( { _id : req.body._id }, { $set : {color : req.body.color } } )
    .then( (updated) => {
      console.log("this was updated", updated);
      
      // Was something updated? No? 404.
      console.log(updated.lastErrorObject.n);
      if (updated.lastErrorObject.n !== 1) {
        res.statusCode = 404;
        return next(Error('Not found in database '))
      }
      
      return res.redirect('/details/' + req.body._id);
    })
    .catch((err) => {
      console.log(err);
      return next(err);
  });
  
});


/* Delete a flower from the database. */
router.post('/delete', idOr404.fromBody, function(req, res, next){
  
  console.log(req.body);
  
  var flowerdoc;
  
  req.flowers.findOne( { _id : req.body._id} )
    
    .then((doc) => {
      flowerdoc = doc;  //hacky????????
      console.log('document', doc);
      if (doc == null) {
        console.log("Not found, stop");
        res.statusCode = 404;
        throw Error("Not found")  /// to 404  // todo goes to error page but  working, status is 500
      }
     
      return req.flowers.findOneAndDelete( {_id: req.body._id } );
      
    })
    
    .then((result) => {
    
      // remove image from filesystem, if present. 'unlink' means delete.
      console.log('delete result', result);
      console.log('delete result', result.value);
      
      if (result.value.img_url ) {
        return fs.exists('public/images/' + result.value.img_url);
        // todo handle file not found without sending error to client
      }
      
    }).then((exists) =>{
    console.log('there is a file on the filesystem? ' + exists);
    //console.log('there is a file on the filesystem? ' + thing);
  
    if (exists) {
      return fs.unlink('public/images/' + flowerdoc.img_url);
    }
  })
    
    .then( () => {
      return res.redirect('/');
    })
    
    .catch((err) =>
      {next(err)});
  
});


/* Use multer to upload the image and save it  */
router.post('/setImage', upload.single('flower_image'), idOr404.fromBody, function(req, res, next){
 
  console.log(req.file);
  
  var filepath = req.file.path + '.jpg';  // e.g. public/images/rose234567432567.jpg
 // var filename =  + '.jpg';  // e.g. rose234567432567.jpg
  
  var filename = req.file.filename + '.jpg';   // todo other extensions
  console.log(filename);
  
  
  fs.rename(req.file.path, filepath)
    
    .then(() => {
    
      console.log('done renaming. Update document....');
      return req.flowers.findOneAndUpdate({_id: req._id}, {$set: {img_url: filename}})
      
    })
    
    .then((result) => {
    
      console.log('updated doc with image, results ' , result);
      return res.redirect('details/' + req._id);
    
  })
    
    .catch((err) => {
      return next(err);
    });
  
  
});

module.exports = router;
