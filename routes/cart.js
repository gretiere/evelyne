var express = require("express");
var router  = express.Router();
var article = require("../models/article");
var middleware = require("../middleware");
var Cart = require("../models/cart");
var Order = require("../models/order");

//INDEX - show all articles
router.get("/", function(req, res){
    console.log(req.session.cart);
    if (req.session.cart) {
        var cart = new Cart(req.session.cart);
        req.session.save(function(){
            res.render("cart/index", {articles: cart.generateArray(), totalPrice: cart.totalPrice, totalQty: cart.totalQty }); 
        });
    }
    
});


router.get("/checkout", function(req, res){
    if (req.session.cart) {
        var cart = new Cart(req.session.cart);
        // console.log (cart.totalPrice);
        req.session.save(function(){
            res.render("cart/show", {articles: cart.generateArray(), totalPrice: cart.totalPrice }); 
        });
    }    
});

router.post('/checkout', function(req, res, next) {
    if (!req.session.cart) {
        req.session.save(function(){
            return res.redirect('/');
        });
    }
    var cart = new Cart(req.session.cart);
    
    var stripe = require("stripe")(
        "sk_test_muYQJTkAY2wHN86XRLdYJojV"
    );
    console.log(req.body.stripeToken);
    stripe.charges.create({
        amount: cart.totalPrice * 100,
        currency: "usd",
        source: req.body.stripeToken, // obtained with Stripe.js
        description: "Test Charge"
    }, function(err, charge) {
        if (err) {
            req.flash('error', err.message);
            console.log(err.message);
            req.session.save(function() {
                return res.redirect('/cart/checkout');
            });
        }
        var order = new Order({
            user: req.user,
            cart: cart,
            address: req.body.address,
            name: req.body.name,
            paymentId: charge.id
        });
        order.save(function(err, result) {
            req.flash('success', 'Successfully bought product!');
            req.session.cart = null;
            console.log('success', 'Successfully bought product!');
            req.session.save(function(){
                res.redirect('/');
            });
        });
    }); 
});
module.exports = router;