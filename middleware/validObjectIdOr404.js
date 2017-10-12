ObjectID = require('mongodb').ObjectID;



function fromParams(req, res, next) {
  
  let _id = req.params._id;
  
  console.log('The middleware says the ID is ', _id);
  
  if (! ObjectID.isValid(_id) ) {
    console.log("No valid ObjectID associated with the _id attribute in the request PARAMS. _id was ", _id);
    res.status(404);
    next(Error("Object ID not found"));   // to the error handler.
  }
  
  else {
    req._id = ObjectID(_id);
    next();   // Continue to process this request
  }
  
}


function fromBody(req, res, next) {
  
  let _id = req.body._id;
  
  console.log('The middleware says the ID is ', _id);
  
  if (! ObjectID.isValid(_id) ) {
    console.log("No valid ObjectID associated with the _id attribute in the request BODY. _id was ", _id);
    res.statusCode = 404;
    next(Error("Object ID not found"));   // to the error handler.
  }
  
  else {
    req._id = ObjectID(_id);
    next();
  }
  
}


module.exports = {
  fromBody: fromBody,
  fromParams: fromParams
};
