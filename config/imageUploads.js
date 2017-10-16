
var path = require('path');

var NODE_ENV = process.env.NODE_ENV;

var uploadDir;


// If running tests,

if (NODE_ENV === 'test') {
  uploadDir = path.join('.', 'test', 'uploadTEST');
}

// For live server, e.g. deployed to Heroku,

else if (NODE_ENV === 'production') {
  uploadDir = path.join('public', 'uploads');  // Replace with live production variable, if different
}


// Otherwise, assume development environment
else {
  uploadDir = path.join('public', 'uploads');  // Development database, most likely on your computer, but may be MongoLab if preferred
}


module.exports = { 'uploadDir': uploadDir };