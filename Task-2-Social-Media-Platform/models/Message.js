const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  from: { type: String, required: true, lowercase: true, trim: true },
  to: { type: String, required: true, lowercase: true, trim: true },
  content: { type: String, required: true, trim: true, maxlength: 500 }
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);
