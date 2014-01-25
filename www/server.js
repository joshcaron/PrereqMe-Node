var http = require("http");
var mongoose = require('mongoose');

// Server things
http.createServer(function(request, response) {
  response.writeHead(200, {"Content-Type": "text/plain"});
  response.write("Hello World");
  response.end();
}).listen(8888);
 
// Mongo DB Fun times
mongoose.connect('mongodb://localhost/volans');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  // yay!
  console.log("Connected to DB");
  var courses = mongoose.get('courses');
  console.log(courses);

});

var courseSchema = new mongoose.Schema({
	attributes: [String],
	description: String,
	lectureHours: {
		max: Number,
		min: Number,
		type: String
	},
	levels: [String],
	prereqstr: String,
	scheduleTypes: [String],
	title: String
});

var Course = mongoose.model('Course', courseSchema);

Course.find(function(err, courses) {
	if (err) {
		console.error(err);
	}
	console.dir(courses);
});