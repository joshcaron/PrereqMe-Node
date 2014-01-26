var api = require("./api.js");

exports.setup = function(app) {
	// The API root
	app.get('/api', function (req, res) {
		res.send('API is running'); 
	});

	app.get('/courses/:deptId/:courseId', function(req, res) {
		var deptId = req.params.deptId;
		var courseId = req.params.courseId;
		var variableScript = "<script type='text/javascript'>\n" +
								"var root_dept = '" + deptId + "';\n" +
								"var root_num = '" + courseId + "';\n" +
							"</script>\n";
		var icicleScript = "<script src='/assets/js/d3.v3.js'></script>\n<script src='/assets/js/jquery.min.js'></script><script src='/assets/js/icicle.js'></script>\n";
		var html = "<!DOCTYPE html>\n" +
						"<html lang='en'>\n" +
						"<head>\n" + 
							"<title>Project Volans: Results</title>\n" +
							"<meta charset='UTF-8' />\n" +
							"<link rel='stylesheet' href='/assets/css/style.css' />\n" +
							"<link href='http://fonts.googleapis.com/css?family=Open+Sans:400,300' rel='stylesheet' type='text/css'>\n" +
							 variableScript + 
							 icicleScript + 
							 "</head\n>" +
						"<body class='white'>\n" +
							"<header class='thick'>\n" +
								"<h3>Prerequesites for " +  deptId + " " + courseId + "</h3>\n" +
							"</header>\n" +
							"<div id='svg'></div>\n" +
						"</body>\n" + 
					"</html>";
		// console.log(html);
		res.send(html);
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