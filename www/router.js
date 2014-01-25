var api = require("./api.js");

exports.setup = function(app) {
	// The API root
	app.get('/api', function (req, res) {
		res.send('API is running');
	});


	// Get all the courses
	app.get('/api/courses', function(req, res) {
		var requestAll = function(success, data) {
			if (!success) {
				console.log("ERROR: " + data);
				res.send(data);
			} else {
				res.send(data);
			}
		}
		api.loadAll(requestAll);
	});

	// Getting courses by department id
	app.get('/api/courses/:deptId', function(req, res) {
		var deptId = req.params.deptId;
		var requestDept = function(success, data) {
			if (!success) {
				console.log("ERROR: " + data);
				res.send(data);
			} else {
				res.send(data);
			}
		}
		api.loadDepartment(deptId, requestDept);
	});

	// Getting courses by department id and course id
	app.get('/api/courses/:deptId/:courseId', function(req, res, next) {
		var deptId = req.params.deptId;
		var courseId = req.params.courseId;
		var requestCourse = function(success, data) {
			if (!success) {
				console.log("ERROR: " + data);
				res.send(data);
			} else {
				res.send(data);
			}
		}
		api.loadCourse(deptId, courseId, requestCourse);
	});
}