import json
import pymongo

# Mongo setup
from pymongo import MongoClient
client = MongoClient()
db = client.volans
collection = db.courses

# JSON setup
json_data=open('all_data.json')
courses = json.load(json_data)
courses_array = []
departments_array = []

for department in courses:
	departments_array.append(department)
	collection.insert(department)

