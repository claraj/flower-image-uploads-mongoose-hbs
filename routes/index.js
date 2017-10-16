var express = require('express');
var idOr404 = require('../middleware/validObjectIdOr404');
var fs = require('fs-extra');
var path = require('path');
var mime = require('mime');

var uploadDir = require('../config/imageUploads').uploadDir;
var multer = require('multer');
var upload = multer({ dest : uploadDir});

var router = express.Router();


/* GET home page, list of all flower documents. */
router.get('/', function(req, res, next) {
  
  // Find all documents, sort by name in ascending order,
  // turn the resulting Cursor into an array.
  
  req.flowers.find({}).sort( {'name': 1} ).toArray()
    .then( (docs) => {
      res.render('all_flowers', { flowers:docs } );
    })
    .catch((err) => {
      next(err);   // to the 500 error handler
    });
  
});



/* Get all the information about one flower. Note the use of
 * URL parameter - the :_id in the path

  * idOr404.fromParams extracts the Object ID from the request parameters
  * converts it to an ObjectID, and adds it to the request as req._id  */
router.get('/details/:_id', idOr404.fromParams, function(req, res, next){
  
  req.flowers.findOne({ _id: req._id }).
  then((doc) => {
    if (doc) {
      res.render('flower_detail', {flower : doc});
    } else {
      res.statusCode = 404;
      next()
    }
  })
    .catch((err) => {
      next(err);
    });
  
});


/* POST to add a new flower. */
router.post('/newFlower', function(req, res, next){
  
  //validate: need a name. Color is optional
  
  if (!req.body.name) {
    req.flash('error', 'Please provide a name');
    return res.redirect('/');
  }
  
  else {
    req.flowers.insertOne(req.body)
      .then((results) => {
        res.redirect('/');
      })
      .catch((err) => {
        next(err);
      });
  }
});


/* Update the color of the flower.
* idOr404.fromBody extracts the Object ID from the request body,
* converts it to an ObjectID, and adds it to the request as req._id  */

router.post('/setColor', idOr404.fromBody, function(req, res, next){
  
  // if no color provided, do not modify any documents
  if (!req.body.color) {
    res.redirect('/details/' + req.body._id);
  }
  
  // Use $set parameter to specify what will be updated
  else {
    
    req.flowers.findOneAndUpdate({_id: req.body._id}, {$set: {color: req.body.color}})
      .then((updated) => {
        
        // Was something updated? No? 404.
        if (updated.lastErrorObject.n !== 1) {
          res.statusCode = 404;
          next();
        }
        else {
          res.redirect('/details/' + req.body._id);
        }
      })
      .catch((err) => {
        next(err);
      });
  }
});


/* Delete a flower from the database. */
router.post('/delete', idOr404.fromBody, function(req, res, next){
  
  req.flowers.findOne( { _id : req.body._id} )
    
    .then((doc) => {
      
      if (doc == null) {
        let notFound = Error("Not found");
        notFound.status = 404;
        next(notFound);
      }
      else {
        return req.flowers.findOneAndDelete({_id: req.body._id});  // pass to next then()
      }
    })
    
    .then((result) => {   //
      
      if (result.value.img_url) {
        return fs.unlink(path.join(uploadDir, result.value.img_url));  // this errors if doesn't exist....
      }
      
    })
    
    .then( () => {
      res.redirect('/');
    })
    
    .catch((err) => {
    
    if (err.code === 'ENOENT') {
      console.log('Warning - tried to delete this file but not found', result.value.img_url)
      res.redirect('/');    // .... file not found - who knows why it's not there, but the goal is to not have it there, so probably ok. Should log a warning.
    }
    else {
      next(err)
    }
    });
  
});


/* Use multer to upload the image and save it
 * idOR404 middleware used too */
router.post('/setImage', upload.single('flower_image'), idOr404.fromBody, function(req, res, next){
  
  console.log('SET IMAGE' , req.file, ' and id is ', req.body._id);
  
  var oldImage;
  var newFilename;
  var newFilepath;
  
  // is there a file provided?
  
  if (!req.file) {
    
    req.flash('error', 'Please provide an image file');
    res.redirect('/details/' + req.body._id);  // back to detail page.
    
  }
  
  else {
  
    // Is there a current image?
  
    req.flowers.findOne({_id: req.body._id}).then((doc) => {
    
      if (doc === null) {
        //404
        let notFound = Error("Not found");
        notFound.status = 404;
        return next(notFound);
      }
    
      else {
        oldImage = doc.img_url;
      }
    })
  
    // Rename to have a .jpg extension
    
      .then(() => {
      
        var multerFilepath = req.file.path;  // e.g. public/images/234567432567
        
        newFilepath = req.file.path + '.' + mime.getExtension(req.file.mimetype);   // todo other extensions
        newFilename = req.file.filename + '.' + mime.getExtension(req.file.mimetype);
        
        console.log('filename is',  newFilepath, req.file.path);
        return fs.rename(req.file.path, newFilepath)
      
      })
    
    
      .then(() => {
      
        console.log('done renaming. Update document....');
        return req.flowers.findOneAndUpdate({_id: req._id}, {$set: {img_url: newFilename}})
      
      })
      
      .then((result) => {
      
        console.log('updated doc with image, results ', result);
        //
        // return res.redirect('details/' + req._id);
        res.redirect('back');
        
      })
  
      .then(() => {
  
        // Delete (unlink) old image
        if (oldImage) {
          return fs.unlink( path.join(uploadDir, oldImage) )
        }
    
      })
      
      .catch((err) => {
      
        if (err.code === 'ENOENT') {
          // deleted file not found, log and ignore
          console.log('Tried to delete the old file for this flower, but it was not found', uploadDir, oldImage)
          res.redirect('back')
        }
      
         next(err);
      });
  
  }
  
  
});

module.exports = router;
