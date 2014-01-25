
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
	self.prereqs = data.courseData.prereqstr;
	self.coreqs = null;
	return self;
}

function courseToClass(course) {
	return new Class(course);
}


function debug(data) {
	// console.log("DEBUG: " + data);
}

/**
 * Loads a course asynchronously
 * @param  {String}   deptId   The department id of the course
 * @param  {Number}   courseId The course id
 * @param  {Function} callback A callback function specified by the signature:
 *                             	function(success, data) { .... }
 */
function loadAsyncCourse(deptId, courseId, callback) {
	Course.find({"departmentId" : deptId}, function(err, courses) {
		if (err) {
			console.log(err);
			callback(false, err);
		}
		var foundCourse = null;
		// Find the course in the department
		courses.forEach(function(course) {
			if (course.courseId == courseId) {
				foundCourse = course;
			}
		});
		if (!foundCourse) {
			callback(false, "Did not find: " + deptId + " " + courseId);
		} else {
			callback(true, foundCourse);
		} 
	});
}

/**
 * Loads a list of courses asynchronously
 * @param  {Array} courses      The list of courses as strings "XXXX 0000"
 * @param  {Function} listCallback The callback function to call when the list has loaded, 
 *                                 specified by the signature:
 *                                 	function(success, data) { ... }
 */
function loadAsyncCourseList(courses, listCallback) {
	var courseData = [];

	// // DEBUG
	// console.log("Loading course list....");
	// console.log(courses);

	async.forEach(courses, function(course, courseLoadedCallback) {
		var pieces = course.split(" ");
		var deptId = pieces[0];
		var courseId = pieces[1];
		var loadCourse = function(success, data) {
			if (!success) {
				console.log("ERROR: " + data + "\n");
			}

			// DEBUG
			// console.log("Loaded a course.");
			// console.log(data);
			
			// courseData.push(data);
			var loadPrereqs = function(success, prereqData) {
				if (!success) {
					console.log(prereqData);
				} else {
					courseData.push(prereqData);					
				}
				courseLoadedCallback();
			}
			if (data && data.courseData && data.courseData.prereqstr) {
				loadAsyncCoursePrereqs(data, loadPrereqs);				
			} else {
				courseLoadedCallback();
			}
		}
		loadAsyncCourse(deptId, courseId, loadCourse);
	}, function(err) { // Finished loading all courses in the list
		if (err) {
			console.log(data);
			listCallback(false, err);
		}
		listCallback(true, courseData);
	});
}

/**
 * Loads the preqreqs of a course asynchronously
 * @param  {Object}   course   The raw course data
 * @param  {Function} callback The callback for after the information has loaded for the course
 */
function loadAsyncCoursePrereqs(course, callback) {
	var prereqList = course.courseData.prereqstr;
	var prereqs = [];
	// DEBUG
	// console.log("Loading prereqs for " + course.departmentId + " " + course.courseId);

	async.forEach(prereqList, function(prereqGroup, prereqGroupLoaded) {
		var loadGroup = function(success, data) {
			if (!success) {
				console.log(data);
			}
			prereqs.push(data);
			prereqGroupLoaded();
		}
		loadAsyncCourseList(prereqGroup, loadGroup);

	}, function(err) { // All prereqs loaded
		if (err) {
			console.log(err);
			callback(false, err);
		} else {
			course.preqreqs = prereqs;
			callback(true, course);
		}

	});	
}


function loadAsyncRoot(deptId, courseId, callback) {
	var course = null;
	var root = null;
	var localData = {
		root: null,
		prereqs: []
	}
	debug("Loading the root " + deptId + " " + courseId);
	async.series([
		// First, we load the root course
		function(rootLoaded) {
			// When the root has loaded
			var rootLoad = function(success, data) {
				if (!success) {
					console.log("ERROR: " + data);
				} else {
					debug("Loaded root " + deptId + " " + courseId + "\n");
					root = data;
					localData.root = new Class(data);
				}
				rootLoaded();
			};

			loadAsyncCourse(deptId, courseId, rootLoad);
		},

		// After root has been loaded, we load the prereqs
		function(allPreqreqsLoaded) {
			// Make sure there are prereqs
			debug("Checking prereqs for " + deptId + " " + courseId);
			if (root && root.courseData && root.courseData.prereqstr && root.courseData.prereqstr.length > 0) {
				// Get all the prereq groups
				debug("Prereqs found.");
				var prereqList = root.courseData.prereqstr;
				debug("Prereqs are: " + prereqList);
				debug("Getting prereqs...");
				var prereqs = [];
				async.forEach(prereqList, function(prereqGroup, groupComplete) {
					var loadGroup = function(success, data) {
						if (!success) {
							console.log("ERROR: " + data);
							groupComplete();
						} else {
							// Loaded the group
							// Now, load the root course for each of them.
							var oldPrereqGroup = data;
							var newPrereqGroup = [];
							async.forEach(oldPrereqGroup, function(prereq, newRootComplete) {
								var pDeptId = prereq.departmentId;
								var pCourseId = prereq.courseId;
								var loadNewRoot = function(success, data) {
									if (!success) {
										console.log("ERROR: " + data);
									} else {
										// Successfully made new roots
										newPrereqGroup.push(data);
									}
									newRootComplete();
								};
								loadAsyncRoot(pDeptId, pCourseId, loadNewRoot);

							}, function(err) { // Loaded the new roots for the prereqs
								if (err) {
									console.log("ERROR: " + err);
								} else {
									prereqs.push(newPrereqGroup);
								}
								debug("Prereqs loaded.");
								groupComplete();
							});
						}
					};
					loadAsyncCourseList(prereqGroup, loadGroup);
				}, function(err) { // All groups are complete
					if (err) {
						console.log("ERROR: " + err);
					}
					localData.prereqs = prereqs;
					allPreqreqsLoaded();
				});
			} else {
				// No prereqs, just go ahead and complete
				debug("No prereqs found.\n");
				allPreqreqsLoaded();
			}
		}
	], function(err) { // Fully loaded the root and its prereqs
		if (err) {
			console.log("ERROR: " + err);
			callback(false, err);
		} else {
			callback(true, localData);
		}
	});
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
		// console.log(res.send);
		Course.find( { "departmentId": req.params.deptId }, function(err, courses) {
			if (err) {
				console.log(err);
				res.send("An error occured and has been logged.");
			}
			res.send(convertCourseList(courses));
		});
	});

	// Getting courses by department id and course id
	app.get('/api/courses/:deptId/:courseId', function(req, res, next) {
		var deptId = req.params.deptId;
		var courseId = req.params.courseId;
		var loadCourses = function(success, data) {
			if (!success) {
				console.log("ERROR: " + data);
			} else {
				console.log("Fully loaded.");
				res.send(data);
			}
		}
		loadAsyncRoot(deptId, courseId, loadCourses)
		// var locals = {
		// 	root: null,
		// 	prereqs: []
		// };
		// var deptId = req.params.deptId;
		// var courseId = req.params.courseId;
		// var rootCourse = null;
		// // Execute a series of async requests
		// async.series([
		// 	// First, we need to get the root course
		// 	function(callback) {
		// 		var loadRootCourse = function(success, data) {
		// 			// DEBUG
		// 			console.log("LOADED ROOT");
		// 			console.log(data);
		// 			if (!success) {
		// 				// ERROR :(
		// 				console.log(data);
		// 			}
		// 			// We loaded the course!
		// 			rootCourse = data;
		// 			locals.root = {
		// 				"dept": data.departmentId,
		// 				"num" : data.courseId,
		// 				"name": data.courseData.title
		// 			}
		// 			callback();
		// 		}
		// 		loadAsyncCourse(deptId, courseId, loadRootCourse);
		// 	},

		// 	// Then, we need to get the prereqs for the root course
		// 	function(callback) {
		// 		var prereqs = [];
				
		// 		var prereqsToLoad = rootCourse.courseData.prereqstr;
		// 		async.forEach(prereqsToLoad, function(prereqGroup, prereqGroupLoaded) {
		// 			var loadPrereqs = function(success, data) {
		// 				if (!success) {
		// 					console.log(data);
		// 				}
		// 				// DEBUG
		// 				console.log("\n\n\n\n\nLoaded prereq group.\n\n\n\n\n\n");
		// 				console.log(data);

		// 				prereqs.push(data);
		// 				prereqGroupLoaded();
		// 			}
		// 			console.log("Fectching group " + prereqGroup);
		// 			loadAsyncCourseList(prereqGroup, loadPrereqs);
		// 		}, function(err) { // After loading all prereq groups
		// 			if (err) {
		// 				console.log(err);
		// 			}
		// 			locals.prereqs = prereqs;
		// 			callback();
		// 		});
		// 	}

		// ], function(err) { // Final callback
		// 	res.send(locals);
		// });

	});
}