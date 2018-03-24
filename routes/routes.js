var express = require('express');
var router = express.Router();
var passport = require('passport');
var async=require('async');
var crypto=require('crypto');
var nodemailer=require('nodemailer');
var LocalStrategy = require('passport-local').Strategy;
var sendgrid = require('sendgrid')('sagardere', '@s1a9g9a3r-sendgrid');
var User = require('../models/users');

//Routes start
router.get('/', function(req, res){
     res.render('login', {
     user: req.user
  });
});



router.get('/isloggedin',function(req,res,next){
  //console.log('isloggedin',req.isAuthenticated())
  if(req.isAuthenticated()){
    return res.json(req.user)
  }else{
    res.json({session:false});
  }
});

router.get('/login', function(req, res) {
  res.render('login', {
    user: req.user
  });
});

router.post('/login', function(req, res, next) {

  passport.authenticate('local', function(err, user, info) {

    if (err) return next(err)

    if (!user) {
      return res.redirect('/login')
    }
    req.logIn(user, function(err) {

      if (err) return next(err);
      console.log("Successfully Logged In...");
      req.flash('Successfully Logged In..');
      return res.redirect('/');

    });
  })(req, res, next);
});

router.get('/login/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token}, function(err, user) {
    if (!user) {
       return res.redirect('/forgot');
    }
    else{
        console.log("successfully Logged In");
        res.redirect('/login');
    }
  });
});

router.post('/login/:token', function(req, res) {

     User.findOne({ resetPasswordToken: req.params.token}, function(err, user) {
        if (!user) {
          res.json('You are not valid user');
          res.redirect('/signup');
        }
        else{
          res.json("you are successfully logged In...")
        }
      });
});

router.get('/signup', function(req, res) {
  //console.log("req : " , req);
  res.render('signup', {
    user: req.user
     //console.log("user : " ,user)
  });
});

router.post('/signup', function(req, res, next) {
  //console.log("@BODY--", req.body);
  var arr = [];

  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
     var user = new User({
          username: req.body.username,
          email: req.body.email,
          password: req.body.password
        });
     //push user data into array
      arr.push(user)

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });

    },
    function(token, user, done) {

        var email = new sendgrid.Email({
            to: user.email,
            from: 'deresagar01@gmail.com',
            subject: 'Signup Varification',
            html: 'Signup Varification.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            '<a href="http://' + req.headers.host + '/login/' + token + '">Varify your Account</a>\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n',
       // html: '<b> varify your email?</b>'
         });

        sendgrid.send(email, function(err, json){

            if(err) { return console.error(err); }
            console.log(json);
            done(err, 'done');
        });

    }
  ], function(err) {
    if (err) {
       res.redirect('/signup');
      return next(err);
   }
    else{
      //console.log("arr" , arr)
      //res.json({success:true,message:"sucessfully created...",data:arr});
      res.redirect('/login');
    }
  });
});

//passport local strategy
passport.use(new LocalStrategy(function(username, password, done) {
  User.findOne({ username: username }, function(err, user) {
    if (err) return done(err);

    if (!user) return done(null, false, { message: 'Incorrect username.' });
    user.comparePassword(password, function(err, isMatch) {

      if (isMatch) {
        console.log("!!!!!!!!!!!!!!!!!!!!!");
        return done(null, user);
      } else {
        return done(null, false, { message: 'Incorrect password.' });
      }
    });
  });
}));

 // used to serialize the user for the session
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

router.get('/logout', function(req, res){
  req.logout();
  res.json({message:'Logout successfully'})
  });

router.get('/forgot', function(req, res) {
  res.render('forgot', {
    user: req.user
  });
});

router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {

    // setup email data with unicode symbols
    var email = new sendgrid.Email({
            to: user.email,
            from: 'deresagar01@gmail.com',
            subject: 'Password Reset',
            html: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          '<a href="http://' + req.headers.host + '/reset/' + token + '">Reset Your Pasword</a>\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n',
        //html: '<b>Click aboue plain text button' // html body
         });

        sendgrid.send(email, function(err, json){

            if(err) { return console.error(err); }
            console.log(json);
            req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
            done(err, 'done');
        });

    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

router.get('/reset/:token', function(req, res) {

  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }

    res.render('reset', {
      user: req.user
    });
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save(function(err) {
          req.logIn(user, function(err) {
            done(err, user);
          });
        });
      });
    },
    function(user, done) {
         let smtpTransport = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        ssl:  true,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'tuytvsw3gakjfuo6@ethereal.email', // generated ethereal user
            pass: 'Z8fRVDCvaqcFsRYmfH' // generated ethereal password
        }
      });

      var mailOptions = {
        to: user.email,// list of receivers
        from: '<[deresagar01@gmail.com]>', // sender address,
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };

      smtpTransport.sendMail(mailOptions, function(err) {
        if (err) {
            return console.log(err);
        }
        req.flash('success', 'Success! Your password has been changed.');
        console.log('Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/');
  });
});


module.exports = router;