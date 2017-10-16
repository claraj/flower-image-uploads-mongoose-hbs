
var NODE_ENV = process.env.NODE_ENV;

var user = process.env.MONGO_USER;
var pw = process.env.MONGO_PW;

var url = 'mongodb';

var db = 'garden';    // Change if reusing this file in another project.

if (user && pw) {
  var creds = user + ":" + pw + "@";
} else {
  creds = '';     // If environment variables not set, for example on lab computers
}


// If running tests,

if (NODE_ENV === 'test') {
  url = 'mongodb://' + creds + '127.0.0.1:27017/' + db + '_test'; // Test database, separate to development database. Most likely on your computer, but may be MongoLab if preferred
}

// For live server, e.g. deployed to Heroku,

else if (NODE_ENV === 'production') {
  url = ''   // Replace with live production database, e.g. MongoLab URL;
}

// Otherwise, assume development environment
else {
  url = 'mongodb://' + creds + '127.0.0.1:27017/' + db;  // Development database, most likely on your computer, but may be MongoLab if preferred
}



module.exports = { 'url': url };