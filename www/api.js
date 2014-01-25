

// ---------------------------------------------------------------------------------------------- //
// Setup of global variables
// ---------------------------------------------------------------------------------------------- //

var DEBUGGING = false;			// Are we in DEBUG mode?
var db = require("./db.js");	// Load the database
var Course = db.Course;			// Load the Course model
var async = require('async');	// Load async, the helper library for asynchronous requests

// Helper function for debugging
function debug(data) { if (DEBUGGING) { console.log("DEBUG: " + data); } }

// ---------------------------------------------------------------------------------------------- //
// Courses and Classes
// ---------------------------------------------------------------------------------------------- //

/**
 * A Class is a Course, but stripped of extraneous data
 * @param {Course} data The Course data to be converted to a Class
 */
var Class = function(data) {
	var self = {};
	self.dept = data.departmentId;
	self.num = data.courseId;
	self.name = data.courseData.title;
	self.prereqs = data.courseData.prereqstr;
	self.coreqs = null;
	return self;
}

/**
 * Convert a Course to a Class
 */
function courseToClass(course) {
	return new Class(course);
}

/**
 * Convert a list of Courses to a list of Classes
 * @param  {Array[Course]} courseList
 * @return {Array[Class]}
 */
function convertCourseList(courseList) {
	var classList = [];
	courseList.forEach(function(course) {
		var c = courseToClass(course);
		classList.push(c);
	});

	return classList;
}

// ---------------------------------------------------------------------------------------------- //
// Loading the Course data
// ---------------------------------------------------------------------------------------------- //

/**
 * Loads a single course asynchronously
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
	async.forEach(courses, function(course, courseLoadedCallback) {
		var pieces = course.split(" ");
		var deptId = pieces[0];
		var courseId = pieces[1];
		var loadCourse = function(success, data) {
			if (!success) {
				console.log("ERROR: " + data + "\n");
			}

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


/**
 * Asyncronously loads a single course, including all prerequisites
 * @param  {String}   deptId   The department the course is in
 * @param  {Number}   courseId The numerical id of the course
 * @param  {Function} callback A callback function for handling the data return
 *
 * @todo Refactor this. A lot.
 */
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

// ---------------------------------------------------------------------------------------------- //
// Exports to be used in other files
// ---------------------------------------------------------------------------------------------- //


/**
 * Load all the courses from the database
 * @param  {Function} callback A callback funtion for handling the data return
 */
exports.loadAll = function(callback) {
	Course.find(function(err, courses) {
		if (err) {
			callback(false, "Could not load all courses.");
		} else {
			callback(true, convertCourseList(courses));
		}
	});
}

/**
 * Loads all the courses for a single department
 * @param  {String}   deptId   The department to load courses from
 * @param  {Function} callback A callback function for handling the data return
 */
exports.loadDepartment = function(deptId, callback) {
	Course.find( { "departmentId": deptId }, function(err, courses) {
		if (err) {
			callback(false, "Could not load department " + deptId);
		} else {
			callback(true, convertCourseList(courses));
		}
	});
}

/**
 * Loads a single course from the database
 * @param  {String}   deptId   The department the course is in
 * @param  {Number}   courseId The numerical id of the course
 * @param  {Function} callback A callback function for handling the data return
 */
exports.loadCourse = function(deptId, courseId, callback) {
	var courseCallback = function(success, data) {
		if (!success) {
			callback(false, "Could not load course " + deptId + " " + courseId);
		} else {
			callback(true, data);
		}
	}
	loadAsyncRoot(deptId, courseId, courseCallback);
}