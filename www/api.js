var Class = function(data) {
	var self = {};
	self.dept = data.departmentId;
	self.num = data.courseId;
	self.name = data.courseData.title;
	self.prereqs = data.courseData.prereqstr;
	return self;
}

var courseToClass = function(course) {
	return new Class(course);
}


var convertCourseList = function(courseList) {
	var classList = [];
	courseList.forEach(function(course) {
		var c = courseToClass(course);
		classList.push(c);
	});

	return classList;
}

exports.setup = function(app) {
	// The API root
	app.get('/api', function (req, res) {
	  res.send('API is running');
	});

	// Get the DB connection
	var db = require("./db.js");
	var Course = db.Course;

	// Get all the courses
	app.get('/api/courses', function(req, res) {
		Course.find(function(err, courses) {
			if (err) {
				console.log(err);
				res.send("An error occured and has been logged.");
			}
			res.send(convertCourseList(courses));
		});
	});

	// Getting courses by department id
	app.get('/api/courses/:deptId', function(req, res) {
		Course.find( { "departmentId": req.params.deptId }, function(err, courses) {
			if (err) {
				console.log(err);
				res.send("An error occured and has been logged.");
			}
			res.send(convertCourseList(courses));
		});
	});

	// Getting courses by department id and course id
	app.get('/api/courses/:deptId/:courseId', function(req, res) {
		var search = {
			"departmentId": req.params.deptId,
			"courseId": parseInt(req.params.courseId)
		};

		Course.find({"departmentId": req.params.deptId}, function(err, courses) {
			if (err) {
				console.log(err);
			}
			var foundCourse = null;
			courses.forEach(function(course) {
				if (course.courseId == req.params.courseId) {
					foundCourse = new Class(course);
				}
			});
			res.send(foundCourse);
		});
	});
}