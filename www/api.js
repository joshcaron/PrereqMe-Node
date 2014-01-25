
// Get the DB connection
var db = require("./db.js");
var Course = db.Course;
var courseLookup = require('./courseLookup.js');

// async
var async = require('async');

var Class = function(data) {
	var self = {};
	self.dept = data.departmentId;
	self.num = data.courseId;
	self.name = data.courseData.title;
	// self.prereqs = data.courseData.prereqstr;
	var prereqObjects = [];
	data.courseData.prereqstr.forEach(function(prereqs) {
		prereqObjects.push(makePrereqs(prereqs));
		// console.log(makePrereqs(prereqs));
	});
	self.prereqs = prereqObjects;
	// console.dir(self.prereqs);
	return self;
}

function courseToClass(course) {
	return new Class(course);
}



// function makePrereqs(prereqList) {
// 	var prereqs = [];
// 	prereqList.forEach(function(prereq) {
// 		var pieces = prereq.split(" ");
// 		var deptId = pieces[0];
// 		var courseId = parseInt(pieces[1]);
// 		courseLookup.find(deptId, courseId, prereqs);
// 	});
// }


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
		console.log(res.send);
		Course.find( { "departmentId": req.params.deptId }, function(err, courses) {
			if (err) {
				console.log(err);
				res.send("An error occured and has been logged.");
			}
			res.send(convertCourseList(courses));
		});
	});

	var serveRequest = function() {
		return function(req, res) {
			var sendEverything = function() {
				return function(err, courses) {
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
				}
			}

			Course.find({"departmentId": req.params.deptId}, sendEverything());
		}
	}

	// Getting courses by department id and course id
	app.get('/api/courses/:deptId/:courseId', function(req, res, next) {
		var locals = {
			root: null
		};
		var deptId = req.params.deptId;
		var courseId = req.params.courseId;
		// Execute a series of async requests
		async.series([
			// First, we need to get the root course
			function(callback) {
				// Grab all the courses in a department
				Course.find({"departmentId" : deptId}, function(err, courses) {
					if (err) {
						console.log(err);
					}
					// Find the course in the department
					courses.forEach(function(course) {
						if (course.courseId == courseId) {
							locals.root = course;
						}
					});

					callback();
				});
			},

			// Then, we need to get the prereqs for the root course
			function(callback) {
				var allPrereqs = locals.root.courseData.prereqstr;
				var prereqs = [];
				// For each list of prereqs, we need to fetch the AND prereqs
				async.forEach(allPrereqs, function(preqreqList, callback) {
					var prereqOR = [];
					// Winthin those ANDs we need to get the ORs
					async.forEach(preqreqList, function(prereq, callback) {
						// Looking up a single course
						var pieces = prereq.split(" ");
						var pDeptId = pieces[0];
						var pCourseId = pieces[1];
						Course.find({"departmentId": pDeptId}, function(err, courses) {
							if (err) {
								console.log(err);
							}
							// Find the course in the department
							courses.forEach(function(course) {
								if (course.courseId == pCourseId) {
									prereqOR.push(course);
								}
							});

							callback();
						});
					}, function() { // Finished fetching all courses in an OR list
						prereqs.push(prereqOR);
						callback();
					});
				}, function(err) { // Finished fetching all AND lists
					locals.prereqs = prereqs;
					callback();
				});
			}

		], function(err) { // Final callback
			res.send(locals);
		});
		
	});
}