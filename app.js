var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var MongoClient = require('mongodb');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
// pretty icon from https://www.iconfinder.com/icons/642219/aroma_blossom_flower_flowers_nature_icon#size=128

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// MONGO_URL = mongodb://localhost:27017/garden
// plus whatever admin creds


//var url = process.env.MONGO_URL;


console.log(process.env.MONGO_URL);

let url = 'mongodb://127.0.0.1:27017/testGarden';

MongoClient.connect(url).then((db) => {
  
  app.use('/', function(req, res, next){
    req.flowers = db.collection('flowers');
    next();
  });
  
  app.use('/', index);
  app.use('/users', users);

// catch 404 and forward to error handler
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

// error handler
  app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    
    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });
  
});


module.exports = app;
