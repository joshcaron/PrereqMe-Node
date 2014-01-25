import json
import pymongo

# Mongo setup
from pymongo import MongoClient
client = MongoClient()
db = client.volans
collection = db.courses

# JSON setup
json_data = open('all_data_new.json')
data = json.load(json_data)

for department, courses in data.iteritems():

	for course in courses:
		mongoCourse = {}
		mongoCourse["departmentId"] = department
		for id, courseData in course.iteritems():
			mongoCourse["courseId"] = id
			mongoCourse["courseData"] = courseData
		collection.insert(mongoCourse)