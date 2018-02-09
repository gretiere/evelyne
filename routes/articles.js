var express = require("express");
var router  = express.Router();
var article = require("../models/article");
var user = require("../models/user");
var middleware = require("../middleware");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
var multer = require("multer");
var fs = require("fs");

/*******************************************
                  cloudinary
*******************************************/

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
var upload = multer({ storage: storage, fileFilter: imageFilter, limits: { fieldSize: 25 * 1024 * 1024 }});

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'dhc7ovnwk', 
  api_key: '242264815357814', 
  api_secret: 'V2mXMArHATZpwkNECabPa20vYvA'
});



/*******************************************
                  avatar
*******************************************/

function getAvatar(allarticles){
    for (var i = 0, len = allarticles.length; i < len; i++) {
        // eval(require("locus"));
        var theArticle = allarticles[i];
        if (allarticles[i].author) {
        user.findById(allarticles[i].author.id).exec(function(err, user) {
           if(err){
               console.log(err);
           }             
            var avatar = user.avatar;
            theArticle.author.avatar = avatar;
        });               
        allarticles[i] = theArticle;    
        }
    }    
    return allarticles;   
};



/*******************************************
                  root
*******************************************/

//INDEX - show all articles
router.get("/", function(req, res){
    console.log("currentUser article/" + req.user);
    if(req.query.search) {
        // Get found articles from DB
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        // Get all articles from DB    
        article.find({nom: regex}, function(err, allarticles){
           if(err){
               console.log(err);
           } else {
                // get the user object yc avatar
            allarticles = getAvatar(allarticles);
            // eval(require("locus"));
            req.session.save(function() {
                res.render("articles/index",{articles:allarticles, page: 'articles'});
            });
            
           }
        });         
    } else {
        // Get all articles from DB    
        article.find({}, function(err, allarticles){
           if(err){
               console.log(err);
           } else {
               req.session.save(function() {
                   res.render("articles/index",{articles:allarticles, page: 'articles'});
               });
              
           }
        });           
    }
});




/*******************************************
                new article
*******************************************/

//NEW - show form to create new article
router.get("/new", middleware.isLoggedIn, function(req, res){
  console.log("currentUser article/new" + req.user);
  req.session.save(function(){
      res.render("articles/new", {user: req.user}); 
  });
   
});



 router.post("/", middleware.isLoggedIn, upload.single('avatarLoad'), function(req, res) {
    // get data from form and add to articles array
    if (req.body.avatarSrcName != "") {
        eval(require("locus"))
        var block = req.body.avatarSrcName.split(";");
        let base64Image = req.body.avatarSrcName.split(';base64,').pop();
        var tempFile = "./public/data/" + req.params.id + ".png";
        fs.writeFile(tempFile, base64Image, {encoding: 'base64'}, function(err) {
            cloudinary.uploader.upload(tempFile,  function(result) {        
              req.body.article.image = result.secure_url;
              req.body.article.author = {
                id: req.user._id,
                username: req.user.username
              };
              article.create(req.body.article, function(err, article) {
                if (err) {
                  req.flash('error', err.message);
                  return res.redirect('back');
                }
                req.session.save(function() {
                  res.redirect('/articles/' + article.id);
                });            
              });
          },  
          {
              public_id: article.id, 
              crop: 'limit',
              width: 640,
              height: 640,
              eager: [
                { width: 200, height: 200, crop: 'thumb', gravity: 'face',
                  radius: 20, effect: 'sepia' },
                { width: 100, height: 150, crop: 'fit', format: 'png' }
              ],                                     
              tags: ['special', 'for_homepage']
          }      
        );
    });     
  } else  {
      console.log("Case else");
  }
});

// SHOW - shows more info about one article
router.get("/:id", function(req, res){

    //find the article with provided ID
    console.log("currentUser article/id" + req.user);
    article.findById(req.params.id).populate("comments").exec(function(err, foundarticle){
        if(err){
            console.log(err);
        } else {
            console.log(foundarticle);
            article.find().where('author.id').equals(foundarticle.author.id).exec(function(err, articles) {
                if(err){
                    req.flash("Error", "Something went wrong.");
                    res.redirect("/");
                }
                // get the user object yc avatar
                user.findById(foundarticle.author.id).exec(function(err, user) {
                    if(err){
                        req.flash("Error", "Something went wrong.");
                        res.redirect("/");
                    }
                    //console.log("article show " + req.user);
                    req.session.save(function(){
                        res.render("articles/show", {article: foundarticle, listArticles:articles, user:user});
                    });
                    
                });
            });
        };
    });
});

// EDIT article ROUTE
router.get("/:id/edit", middleware.checkarticleOwnership, upload.single('image'), function(req, res){
    article.findById(req.params.id, function(err, foundarticle){
           console.log("currentUser article/id/edit" + req.user);
        req.session.save(function(){
            res.render("articles/edit", {article: foundarticle, user:req.user});
        });
    });
});


// UPDATE article ROUTE
router.put("/:id", upload.single('avatarLoad'), function(req, res){
   
    if (req.body.avatarSrcName != "") {
        var block = req.body.avatarSrcName.split(";");
        let base64Image = req.body.avatarSrcName.split(';base64,').pop();
        var tempFile = "./public/data/" + req.params.id + ".png";
        fs.writeFile(tempFile, base64Image, {encoding: 'base64'}, function(err) {
            cloudinary.uploader.upload(tempFile,  function(result) {        
              req.body.article.image = result.secure_url;
              req.body.article.author = {
                id: req.user._id,
                username: req.user.username
              };

             // find and update the correct article
             article.findByIdAndUpdate(req.params.id, req.body.article, {new: true}, function(err, updatedarticle){
              if(err){
                 req.session.save(function(){
                      res.redirect("/articles");
                  });
                } else {
                 //redirect somewhere(show page)
                 console.log("currentUser article/put" + req.user);
                 req.session.save(function(){
                     res.redirect("/articles/" + req.params.id);
                 });
                }
              });
          },  
          {
              public_id: article.id, 
              crop: 'limit',
              width: 640,
              height: 640,
              eager: [
                { width: 200, height: 200, crop: 'thumb', gravity: 'face',
                  radius: 20, effect: 'sepia' },
                { width: 100, height: 150, crop: 'fit', format: 'png' }
              ],                                     
              tags: ['special', 'for_homepage']
          }      
        );
    });     
  } else  {
      console.log("Case else");
  }


});

// DESTROY article ROUTE
router.delete("/:id",middleware.checkarticleOwnership, function(req, res){
   article.findByIdAndRemove(req.params.id, function(err){
      if(err){
          req.session.save(function(){
              res.redirect("/articles");
          });
      } else {
          req.session.save(function(){
              res.redirect("/articles");
          });
      }
   });
});


function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;

