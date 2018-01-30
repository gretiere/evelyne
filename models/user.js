var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

// Ce schéma doit être complété
// id
// avatar
// sexe
// type : vendeur/client
// profil
// email
var UserSchema = new mongoose.Schema({
    username: {type: String, unique: true, required:true},
    password: String,
    isAdmin: {type: Boolean, default: false},
    isVendor: {type: Boolean, default:false},
    avatar: String,
    firstName: String,
    lastName:  String,
    email:  {type: String, unique: true, required:true},
    description: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date    
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);