const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const FileSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    filepath: { type: String, required: true },
    tags: [String],
    views: { type: Number, default: 0 },
    shareableLink: { type: String },
}, { timestamps: true }); 

FileSchema.plugin(AutoIncrement, {
    inc_field: 'order',
    start_seq: 0
});

module.exports = mongoose.model('File', FileSchema);
