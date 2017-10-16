ObjectID = require('mongodb').ObjectID;


function fromParams(req, res, next) {
  
  let _id = req.params._id;
  
  if (! ObjectID.isValid(_id) ) {
    let notFound = Error('Not a valid Object ID');
    notFound.status = 404;
    next(notFound);
  }
  
  else {
    req._id = ObjectID(_id);
    req.params._id = Object(_id);
    next();   // Continue to process this request
  }
  
}


function fromBody(req, res, next) {
  
  let _id = req.body._id;
  
  if (! ObjectID.isValid(_id) ) {
    let notFound = Error('Not a valid Object ID');
    notFound.status = 404;
    next(notFound);   // to the error handler.
  }
  
  else {
    req._id = ObjectID(_id);
    req.body._id = ObjectID(_id);
    next();
  }
  
}


module.exports = {
  fromBody: fromBody,
  fromParams: fromParams
};
