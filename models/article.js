var mongoose = require("mongoose");

// doit être complété :
// prix
// état
// ...
var articleSchema = new mongoose.Schema({
   name: String,
   nom: String,
   nomSecondaire: String,
   image: String,
   image2 :String,
   image3 :String,
   illustration: String,
   description: String,
   descriptionTechnique: String,   
   prix: Number,
   cost: Number,
   couleurTheme: String,
   afficheVitrine: Boolean,
   meanRating : Number,
   author: {
      id: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User"
      },
      username: String,
      avatar: String
   },
   comments: [
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Comment"
      }
   ],
   photos: [
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Photo"
      }
   ]
});

module.exports = mongoose.model("article", articleSchema);