var express = require("express");
var router  = express.Router();
var passport = require("passport");
var User = require("../models/user");
var Article = require("../models/article");
var Cart = require("../models/cart");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
var fs = require("fs");

function addCartToAllRoutes(req, res, next){
    var cart = new Cart(req.session.cart ? req.session.cart : {});
    req.session.cart = cart;
    // Update: based on latest version of express, better use this
    res.locals.session.cart = cart;
  next();
};


/*******************************************
                  cloudinary
*******************************************/

var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter});

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'dhc7ovnwk', 
  api_key: '242264815357814', 
  api_secret: 'V2mXMArHATZpwkNECabPa20vYvA'
});

/*******************************************
                  /
*******************************************/

router.get('/*', addCartToAllRoutes);

//root route
router.get("/", function(req, res){
    var cart = new Cart(req.session.cart ? req.session.cart : {});
    req.session.cart = cart;
    console.log(req.session);
    // eval(require("locus"));
    res.render("landing");
});


/*******************************************
                  register
*******************************************/
// show register form
router.get("/register", function(req, res){
   res.render("register", {page: 'register'}); 
});

//handle sign up logic
router.post("/register", function(req, res){

    var newUser = new User({
            username: req.body.username,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email
        });
        
    if (req.body.avatar) {
        newUser.avatar = req.body.avatar;
    } else {
        newUser.avatar = "https://ssl.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png";
    };
    if (req.body.isVendor == "1"){
        newUser.isVendor = true; 
    };
    if (req.body.adminCode === "admin123") {
        newUser.isAdmin = true;
    };
    
    // eval(require("locus"));
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render("register", {error: err.message});
        }
        passport.authenticate("local")(req, res, function(){
           //req.flash("success", "Welcome to YelpCamp " + user.username);
           res.redirect("/articles"); 
        });
    });
});


/*******************************************
                  login
*******************************************/

//show login form
router.get("/login", function(req, res){
   res.render("login", {page: 'login'}); 
});

//handling login logic
router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/articles",
        failureRedirect: "/login"
    }), function(req, res){
});


/*******************************************
                  logout
*******************************************/


// logout route
router.get("/logout", function(req, res){
   req.logout();
   //req.flash("success", "Logged you out!");
   res.redirect("/articles");
});



/*******************************************
                  forgot
*******************************************/

// forgot password
router.get('/forgot', function(req, res) {
  res.render('forgot');
});

// forgotten password
// pass: process.env.GMAILPW
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
        if(err){
            req.flash("Error", "Something went wrong.");
            res.redirect("/");
        }          
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
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'gilles.retiere@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      
      var mailOptions = {
        to: user.email,
        from: 'gilles.retiere@gmail.com',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
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
    res.render('reset', {token: req.params.token});
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
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'gilles.retiere@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'gilles.retiere@gmail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/articles');
  });
});

// User profile
router.get("/users/:id", function(req, res){
    User.findById(req.params.id, function(err, foundUser){
        if(err){
            req.flash("Error", "Something went wrong.");
            res.redirect("/");
        }
        Article.find().where('author.id').equals(foundUser._id).exec(function(err, articles) {
            if(err){
                req.flash("Error", "Something went wrong.");
                res.redirect("/");
            }
            res.render("users/show", {user: foundUser, articles:articles});
        });
    });
});


// EDIT article ROUTE
router.get("/users/:id/edit", function(req, res){
    User.findById(req.params.id, function(err, foundUser){
        if(err){
            req.flash("Error", "Something went wrong.");
            res.redirect("/");
        }
        Article.find().where('author.id').equals(foundUser._id).exec(function(err, articles) {
            if(err){
                req.flash("Error", "Something went wrong.");
                res.redirect("/");
            }
            res.render("users/edit", {user: foundUser, articles:articles});
        });
    });

});




// UPDATE article ROUTE
router.put("/users/:id",  upload.single('image'), function(req, res){


      // si pas de nouvel avatar, alors il faut passer l'étape uploader mais updater les autres champs
      // eval(require("locus"))
      if (req.body.avatarSrcName != "") {
        var block = req.body.avatarSrcName.split(";");
        let base64Image = req.body.avatarSrcName.split(';base64,').pop();
        var tempFile = "./public/data/" + req.params.id + ".png";
        fs.writeFile(tempFile, base64Image, {encoding: 'base64'}, function(err) {
            console.log('File created');
            //var imgAvatar = fs.readFileSync(tempFile);
            cloudinary.uploader.upload(tempFile,  function(result) {
              req.body.avatar = result.secure_url;
              User.findByIdAndUpdate(req.params.id, req.body, {new: true}, function(err, updateduser){
                 if(err){
                     console.log(err);
                     req.session.save(function(){
                          res.redirect("/articles");
                     });
                 } else {
                     //redirect somewhere(show page)
                     console.log("currentUser user/put" + updateduser);
                     req.session.save(function(){
                         res.redirect("/");
                     });
                 }
              });    
             },
              {
                public_id: User.id, 
                crop: 'limit',
                width: 100,
                height: 100,
                tags: ['special', 'for_homepage']
              }      
            );
        });        
      } else {
          User.findByIdAndUpdate(req.params.id, req.body, {new: true}, function(err, updateduser){
             if(err){
                 console.log(err);
                 req.session.save(function(){
                      res.redirect("/articles");
                 });
             } else {
                 //redirect somewhere(show page)
                 console.log("currentUser user/put" + updateduser);
                 req.session.save(function(){
                     res.redirect("/");
                 });
             }
          });        
      }

});






router.get("/add-to-cart/:id", function(req, res) {
    var articleId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});
    
    Article.findById(articleId, function(err, article){
      if(err){
          console.log(err);
          return res.render("/", {error: err.message});
      }
      
      cart.add (article, article.id);
      // console.log (cart);
      req.session.cart = cart;
      res.redirect("/articles");
    });
    
});

module.exports = router;