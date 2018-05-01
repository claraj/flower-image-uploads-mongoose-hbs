var mongoose = require('mongoose');

var flowerSchema = new mongoose.Schema({

  name: String,
  img_url: String,
  color: String

})

var Flower = mongoose.model('Flower', flowerSchema);

module.exports = Flower;
