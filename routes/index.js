//Require all routes
var express = require('express');
var router = express.Router();

var userController = require('./user')();


//user
router.get('/',userController.home);
router.get('/isloggedin',userController.isloggedin);
router.get('/login',userController.login);
router.post('/login',userController.login);
router.get('/login/:token',userController.loginTokenGet);
router.post('/login/:token',userController.loginTokenPost);
router.get('/signup',userController.signUpGet);
router.get('/logout',userController.logout);
router.get('/forgot',userController.forgotGet);
router.post('/forgot',userController.forgotPost);
router.get('/reset/:token',userController.resetTokenGet);
router.post('/reset/:token',userController.resetTokenPost);

//export router
module.exports = router;