const title = "VLK"
const subTitle = "Very Little Kompany"
const bannerTitleH1 = "Section 1 : Title"
const bannerTitleH2 = "Section 2 : Title"
const bannerTitleH3 = "Section 3 : Title"
const bannerTitleH4 = "Section 4 : Title"
const bannerTitleH5 = "Section 5 : Title"

var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    flash       = require("connect-flash"),
    passport    = require("passport"),
    LocalStrategy = require("passport-local"),
    methodOverride = require("method-override"),
    article     = require("./models/article"),
    Comment     = require("./models/comment"),
    User        = require("./models/user"),
    Cart        = require("./models/cart"),
    seedDB      = require("./seeds"),
    multer      = require("multer")
    

//requiring routes
var commentRoutes    = require("./routes/comments"),
    articleRoutes    = require("./routes/articles"),
    indexRoutes      = require("./routes/index"),
    cartRoutes       = require("./routes/cart")
    
mongoose.connect("mongodb://localhost/evelyneshop_v1");
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + '/javascripts')); // This line.
app.use(methodOverride("_method"));
app.use(flash());
// seedDB(); //seed the database

// PASSPORT CONFIGURATION
var session = require("express-session");
var MongoStore = require("connect-mongo")(session);
app.use(session({
    secret: "Once again Rusty wins cutest dog!",
    resave: true,
    saveUninitialized: false,
    store : new MongoStore({ mongooseConnection: mongoose.connection })
}));

// session and login state
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.error = req.flash("error");
   res.locals.success = req.flash("success");
   res.locals.title = title;
   res.locals.subTitle = subTitle;
   res.locals.bannerTitleH1 = bannerTitleH1;
   res.locals.bannerTitleH2 = bannerTitleH2;
   res.locals.bannerTitleH3 = bannerTitleH3;
   res.locals.session = req.session;
   next();
});

app.use("/", indexRoutes);
app.use("/articles", articleRoutes);
app.use("/articles/:id/comments", commentRoutes);
app.use("/cart", cartRoutes);


app.listen(process.env.PORT, process.env.IP, function(){
   console.log("The VLK JS Server Has Started! ");
});