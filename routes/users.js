var express = require('express');
var result = express.result();
var passport = require('passport');
var async=require('async');
var crypto=require('crypto');
var nodemailer=require('nodemailer');
var LocalStrategy = require('passport-local').Strategy;
var sendgrid = require('sendgrid')('your-sendgrid-username', 'your-sendgrid-password');

// require  user models
var User = require('../models/users');

module.exports = () => {

    var result = {};

    result.home = (req, res) => {
        res.render('login', {
         user: req.user
      });
    }

    result.isloggedin = (req, res, next) => {
        //console.log('isloggedin',req.isAuthenticated())
        if(req.isAuthenticated()){
          return res.json(req.user)
        } else {
          res.json({session:false});
        }
    }


    result.login = (req, res) => {
        res.render('login', {
          user: req.user
        });
    }

  result.login = (req, res, next) => {

    passport.authenticate('local', (err, user, info) => {

      if (err) return next(err)

      if (!user) {
        return res.redirect('/login')
      }
      req.logIn(user, (err) => {

        if (err) return next(err);
        console.log("Successfully Logged In...");
        req.flash('Successfully Logged In..');
        return res.redirect('/');

      });
    })(req, res, next);
  }

  result.loginTokenGet = (req, res) => {
   
      User.findOne({ resetPasswordToken: req.params.token},(err, user) => {
        if (!user) {
           return res.redirect('/forgot');
        } else {
             console.log("successfully Logged In");
            res.redirect('/login');
        }
      });
  }

  result.loginTokenPost = (req, res) => {

      User.findOne({ resetPasswordToken: req.params.token}, function(err, user) {
          if (!user) {
            res.json('You are not valid user');
            res.redirect('/signup');
          } else {
            res.json("you are successfully logged In...")
          }
        });
  }

  result.signUpGet = (req, res) => {
        //console.log("req : " , req);
        res.render('signup', {
          user: req.user
           //console.log("user : " ,user)
        });
  }

  result.signUpPost = (req, res, next) => {
    //console.log("@BODY--", req.body);
    var arr = [];

    async.waterfall([
      function(done) {
        crypto.randomBytes(20, (err, buf) => {
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

          user.save((err) => {
            done(err, token, user);
          });

      },
      function(token, user, done) {

          var email = new sendgrid.Email({
              to: user.email,
              from: 'your email address',
              subject: 'Signup Varification',
              html: 'Signup Varification.\n\n' +
              'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
              '<a href="http://' + req.headers.host + '/login/' + token + '">Varify your Account</a>\n\n' +
              'If you did not request this, please ignore this email and your password will remain unchanged.\n',
         // html: '<b> varify your email?</b>'
           });

          sendgrid.send(email, (err, json) => {

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
  }

  //passport local strategy
  passport.use(new LocalStrategy((username, password, done) => {
      User.findOne({ username: username }, (err, user) => {
        if (err) return done(err);

        if (!user) return done(null, false, { message: 'Incorrect username.' });
        user.comparePassword(password, (err, isMatch) => {

          if (isMatch) {
              return done(null, user);
          } else {
            return done(null, false, { message: 'Incorrect password.' });
          }
        });
      });
  }));

   // used to serialize the user for the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // used to deserialize the user
  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
      done(err, user);
    });
  });

  result.logout = (req, res) => {
      req.logout();
      res.json({message:'Logout successfully'})
    }

  result.forgotGet = (req, res) => {
      res.render('forgot', {
        user: req.user
      });
  }

  result.forgotPost = (req, res, next) => {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, (err, buf) => {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ email: req.body.email },(err, user) => {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot');
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save((err) => {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {

      // setup email data with unicode symbols
      var email = new sendgrid.Email({
              to: user.email,
              from: 'your email address',
              subject: 'Password Reset',
              html: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            '<a href="http://' + req.headers.host + '/reset/' + token + '">Reset Your Pasword</a>\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n',
          //html: '<b>Click aboue plain text button' // html body
           });

          sendgrid.send(email,(err, json) => {
              if(err) { 
                  return console.error(err); 
                }

              console.log(json);
              req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
              done(err, 'done');
          });

      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/forgot');
    });
  }

  result.resetTokenGet = (req, res) => {

      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('/forgot');
        }

        res.render('reset', {
          user: req.user
        });
      });
  }

  result.resetTokenPost = (req, res) => {
    async.waterfall([
      function(done) {
        User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }

          user.password = req.body.password;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;

          user.save((err) => {
            req.logIn(user, (err) => {
              done(err, user);
            });
          });
        });
      },
      function(user, done) {
         var email = new sendgrid.Email({
              to: user.email,
              from: 'your email address',
              subject: 'Your password has been changed',
              text: 'Hello,\n\n' +
                'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n',
         // html: '<b> varify your email?</b>'
           });

          sendgrid.send(email, (err, json) => {

              if(err) {
                 return console.error(err); 
               }
              req.flash('success', 'Success! Your password has been changed.');
              console.log('Success! Your password has been changed.');
              console.log(json);
              done(err);
          });
      }
    ], function(err) {
      res.redirect('/');
    });
  }

  return result;
}





