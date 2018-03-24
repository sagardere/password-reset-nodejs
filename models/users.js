var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

//Define a schema
var UserSchema = new mongoose.Schema({
    username: { 
                type: String,
                required: true,
                unique: true 
              },
	  email: { 
              type: String,
              required: true,
              unique: true 
            },
	  password: { 
                type: String,
                required: true 
              },
	  resetPasswordToken: String,// used for after password reset is submitted
	  resetPasswordExpires: Date
});


UserSchema.createUser = (newUser, callback) => {
  bcrypt.genSalt(10, (err, salt) => {
     // Store hash in your password DB.
      bcrypt.hash(newUser.password, salt, (err, hash) => {
          console.log(newUser);
          newUser.password = hash;

          newUser.save(callback);
      });
  });
}

UserSchema.getUserByUsername = (username, callback) => {
  var query = {username: username};
  User.findOne(query, callback);
}

UserSchema.getUserById = (id, callback) => {
  User.findById(id, callback);
}

UserSchema.comparePassword = (candidatePassword, hash, callback) => {
  // Load hash from your password DB.
  bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
      if(err) throw err;
      callback(null, isMatch);
  });
}


//authenticate input against database
UserSchema.statics.authenticate =  (email, password, callback) => {
  User.findOne({ email: email })
    .exec((err, user) => {
      if (err) {
        return callback(err)
      } else if (!user) {
        var err = new Error('User not found.');
        err.status = 401;
        return callback(err);
      }
      bcrypt.compare(password, user.password,(err, result) => {
        if (result === true) {
          return callback(null, user);
        } else {
          return callback();
        }
      })
    });
}

//hashing a password before saving it to the database
UserSchema.pre('save',(next) => {
  var user = this;
  bcrypt.hash(user.password, 10, (err, hash) => {
    if (err) {
      return next(err);
    }
    user.password = hash;
    next();
  })
});

UserSchema.methods.comparePassword = (candidatePassword, cb) => {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    if (err) return cb(err);
    cb(null, isMatch);
  })
};


var User = mongoose.model('User', UserSchema);

//Export  User Module
module.exports = User;