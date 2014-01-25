// Server things
var application_root = __dirname,
    express = require("express"),
    path = require("path"),
    mongoose = require('mongoose');

var app = express();

// Config
app.configure(function () {
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(application_root, "public")));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

// Mongo DB Fun times
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
		prereqstr: String,
		scheduleTypes: [String],
		title: String,
		departmentId: String
	}
});

var Course = mongoose.model('Course', courseSchema);

// The API root
app.get('/api', function (req, res) {
  res.send('API is running');
});

// Get all the courses
app.get('/api/courses', function(req, res) {
	Course.find(function(err, courses) {
		if (err) {
			console.log(err);
			res.send("An error occured and has been logged.");
		}
		res.send(courses);
	});
});

// Getting courses by department id
app.get('/api/courses/:deptId', function(req, res) {
	Course.find( { "departmentId": req.params.deptId }, function(err, courses) {
		if (err) {
			console.log(err);
			res.send("An error occured and has been logged.");
		}
		res.send(courses);
	});
});

// Getting courses by department id and course id
app.get('/api/courses/:deptId/:courseId', function(req, res) {
	// console.log(req.params.deptId);
	// console.log(req.params.courseId);
	var search = {
		"departmentId": req.params.deptId,
		"courseId": parseInt(req.params.courseId)
	};
	Course.find(search, function(err, course) {
		if (err) {
			console.log(err);
			res.send("An error has occured and has been logged.");
		}
		res.send(course);
	});
});

// Launch server

app.listen(8888);
