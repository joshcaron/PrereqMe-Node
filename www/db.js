// Mongo DB Fun times
mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/volans');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
	console.log("Connected to DB");
});

var courseSchema = new mongoose.Schema({
	departmentId: String,
	courseId: Number,
	courseData: {
		attributes: [String],
		description: String,
		lectureHours: {
			max: Number,
			min: Number,
			type: String
		},
		levels: [String],
		prereqstr: [],
		scheduleTypes: [String],
		title: String,
		departmentId: String
	}
});

var Course = mongoose.model('Course', courseSchema);

exports.Course = Course;