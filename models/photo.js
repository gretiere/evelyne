var mongoose = require("mongoose");

var photoSchema = mongoose.Schema({
    image: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    }
});

module.exports = mongoose.model("Photo", photoSchema);