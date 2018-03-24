var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session')
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var MongoClient = require('mongodb').MongoClient;
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var flash = require('express-flash');
var MongoDBStore = require('connect-mongodb-session')(session);
var app = express();

//reqire routes folder
var index = require('./routes/index');


//connect to MongoDB
mongoose.connect('mongodb://localhost/loginapp' , { useMongoClient: true });
var db = mongoose.connection;

//handle mongo error
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  // we're connected!
});

//use sessions for tracking logins
app.use(session({
  secret: 'secret',
  path: '/',
  cookie: {
       maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week

      //expires: new Date(Date.now() + (30 * 86400 * 1000))
      //touchAfter: 24 * 3600 // time period in seconds
      },
  resave: true,
  saveUninitialized: false,
  store: new MongoDBStore({
    mongooseConnection: db
  })
}));

// Middleware
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Passport init
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// serve static files from template
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', index);


app.listen(app.get('port'), function() {
  console.log('Server Starting on port ' + app.get('port'));
});