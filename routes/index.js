var express = require('express');
var Flower = require('../model/flower')
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

  Flower.find({}, {'name': 1})
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
router.get('/details/:_id', function(req, res, next){

  Flower.findOne({ _id: req.params._id }).
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

    var flower = Flower(req.body)
    flower.save()
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

router.post('/setColor', function(req, res, next){

  // if no color provided, do not modify any documents
  if (!req.body.color) {
    res.redirect('/details/' + req.body._id);
  }

  // Use $set parameter to specify what will be updated
  else {

    Flower.findOneAndUpdate({_id: req.body._id}, {$set: {color: req.body.color}})
      .then((updated) => {

        // Was something updated? No? 404.
        if (!updated) {
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
router.post('/delete', function(req, res, next){

  var flower;

  Flower.findOne( { _id : req.body._id} )

    .then((doc) => {

      flower = doc;
      if (doc == null) {
        let notFound = Error("Not found");
        notFound.status = 404;
        next(notFound);
      }
      else {
        return Flower.findByIdAndRemove(req.body._id);  // pass to next then()
      }
    })

    .then((result) => {

      // Delete image, if it exists
      if (flower.img_url) {
        return fs.unlink(path.join(uploadDir, flower.img_url));  // this errors if doesn't exist....
      }

    })

    .then( () => {
      res.redirect('/');
    })

    .catch((err) => {

      if (err.code === 'ENOENT') {
        console.log('Warning - tried to delete this file but not found', flower.img_url);
        res.redirect('/');    // .... file not found - who knows why it's not there, but the goal is to not have it there, so probably ok. Should log a warning.
      }
      else {
        next(err)
      }
    });

});


/* Use multer to upload the image and save it
 * idOR404 middleware used too */
router.post('/setImage', upload.single('flower_image'), function(req, res, next){

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

    Flower.findOne({_id: req.body._id}).then((doc) => {

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

        console.log('rename');

        newFilepath = req.file.path + '.' + mime.getExtension(req.file.mimetype);   // todo other extensions
        newFilename = req.file.filename + '.' + mime.getExtension(req.file.mimetype);

        return fs.rename(req.file.path, newFilepath)

      })

      .then(() => {

        console.log('updating datab' +
          '');


        return Flower.findByIdAndUpdate( req.body._id, {img_url: newFilename})
      })

      .then(() => {

        console.log('delete old');


        // Delete (unlink) old image
        if (oldImage) {
          return fs.unlink( path.join(uploadDir, oldImage) )
        }

      }).catch( (err) => {
      // can't delete file - probably because it doesn't exist. Log and continue
      console.log('Tried to delete the old file for this flower, but it was not found', uploadDir, oldImage)
      // TODO TEST ME!
    } )

      .then((result) => {

        console.log('time to redirect ');

        res.redirect('back');
      })

      .catch((err) => {
        console.log('err', err);
        next(err);
      });

  }


});

module.exports = router;
