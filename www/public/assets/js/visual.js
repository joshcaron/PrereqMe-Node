var Volans = {
	url: "http://localhost:2369/api/courses",

	data: null,

	fetch: function(deptId, courseId, callback) {
		var url = this.url;
		if (deptId) {
			url += "/" + deptId;
		}
		if (courseId) {
			url += "/" + courseId;
		}
		console.debug("Fetching from: " + url);
		var jqxhr = $.getJSON(url);
		// Successfully got data, so set it
		jqxhr.done(this.setData);
		if (callback) {
			jqxhr.done(callback);
		}
		// API error
		jqxhr.error(function(data) {
			console.error("Error fetching data from " + url);
			console.dir(data);
		});
	},

	getCourseTitle: function(course) {
		return course.dept + " " + course.num;
	},

	setData: function(data) {
		Volans.data = data;
		console.log("Successfully set data from " + this.url);
		console.dir(data);
	},

	fetchAllPrereqs: function(course) {
		var prereqs = [];
		if (course.prereqs.length > 0) {
			root.prereqs.map(function(prereqGroup) {
				prereqGroup.map(function(prereq) {
					prereqs.push(prereq);
				});
			});
		}

		return prereqs;
	}
}

var Icicle = {

	width: 1400,
	height: 650,

	map: null,

	colors: [
		["#3182BD", "#6BAED6", "#9ECAE1", "#C6DBEF"],
		["#E6550D", "#FD8D3C", "#FDAE6B", "#FDD0A2"],
		["#31A354", "#74C476", "#A1D99B", "#C7E9C0"],
		["#756BB1", "#9E9AC8", "#BCBDDC", "#DADAEB"],
		["#393B79", "#5254A3", "#6B6ECF", "#9C9EDE"],
		["#637939", "#8CA252", "#B5CF6B", "#CEDB9C"],
		["#8C6D31", "#BD0E39", "#E7BA52", "#E7CB94"],
		["#843C39", "#AD494A", "#D6616B", "#E7969C"],
		["#7B4173", "#A55194", "#CE6DBD", "#DE9ED6"]
	],

	svgSelector: "#svg",

	svg: null,

	setup: function(deptId, courseId) {
		var svg = d3.select(this.svgSelector).append("svg");
		svg.attr("width", this.width);
		svg.attr("height", this.height);
		this.svg = svg;

		var coursesFetched = function(data) {
			var map = d3.map();
			Icicle.map = Icicle.setupMapData(map, data, 0);
			// Icicle.draw();
		}

		// Asynchronously fetch the course data
		var courses = Volans.fetch(deptId, courseId, coursesFetched);
	},

	setupMapData: function(map, courses, colorIndex) {
		var root = courses.root;
		if (!root) {
			console.error("Error fetching root.");
			return;
		}

		var colorGroup = Icicle.colors[colorIndex];
		var colorNum = parseInt(Math.random() * colorGroup.length) + 1;
		var color = colorGroup[colorNum];
		root.color = color;

		var title = Volans.getCourseTitle(root);
		map.set(title, root);

		var prereqs = courses.prereqs;
		prereqs.forEach(function(prereqGroup) {
			colorIndex++;
			prereqGroup.forEach(function(prereq) {
				map = Icicle.setupMapData(map, prereq, colorIndex);
			});
		});

		return map;
	},

	partition: function() {
		var childrenFunc = function(course) {
			if (!course || !course.prereqs || course.prereqs.length === 0) {
				return null;
			}
			return Volans.fetchAllPrereqs(course);
		}

		return d3.layout.partition().children(childrenFunc).value(function(d) { return 1});
	},

	draw: function() {
		var sel = this.svg.selectAll("rect").data(Icicle.partition(Volans.data)).enter();
		sel.append("rect")
			.attr("x", function(d) { return x(d.x); })
			.attr("y", function(d) { return y(d.y); })
			.attr("width", function(d) { return x(d.dx); })
			.attr("height", function(d) { return y(d.dy); })
			.attr("fill", function(d) { return d.color; });
	}
}

$(document).ready(function() {
	Icicle.setup("CS", "3500");
});