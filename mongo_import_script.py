import json
import pymongo
import re

# Mongo setup
from pymongo import MongoClient
client = MongoClient()
db = client.volans
collection = db.courses

# JSON setup
json_data = open('all_data_new.json')
data = json.load(json_data)




# Get a list of prerequisites for the given course
def get_prereq(prereqstr):
	prereq_list = []
	if (prereqstr):
		prereqs = prereqstr.split("Coreq")[0]
		ands = prereqs.split(" and")
		for prereq in ands:
			ors = re.findall("[A-Z]{2,4} [0-9]{4}", prereq)
			if (len(ors) == 0):
				continue
			else:
				prereq_list.append(ors)

		return prereq_list

	return prereq_list






for department, courses in data.iteritems():

	for course in courses:
		mongoCourse = {}
		mongoCourse["departmentId"] = department
		for id, courseData in course.iteritems():
			courseData["prereqstr"] = get_prereq(courseData["prereqstr"])
			mongoCourse["courseId"] = id
			mongoCourse["courseData"] = courseData
		collection.insert(mongoCourse)
