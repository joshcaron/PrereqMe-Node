This started out a group project during my Human-Computer Interaction class, where we had design and mockup searching for a class and viewing prerequisites. Since then, the team has moved on, but I have kept continuing with the product. 

I built a scraper using Python to scrape the Northeastern course database and turned the data into JSON. Then, during [Hack@Brown][], I dedicated a solid 24 hours to working on it some more. I took my scraped JSON and imported it into MongoDB. I then built the API using Node.js (my first experience with ever using it). Currently, there is not as much data returned as I have scraped, as we simplified it for demonstration purposed during the hackathon. I worked with one other developer during the hackathon, who built the frontend using d3.js as a visualizer (which I am in the process of rewriting). 

The project is live at http://prereq.me/ and can be queried using the frontend. Some examples are:


| Department |  Course |
|------------|---------|
|     CS     |   2600  |
|    ECON    |   3560  |
|    MATH    |   3081  |


You can also query the JSON API directly by going to http://prereq.me/api/courses/DEPARTMENT/COURSE where DEPARTMENT and COURSE are substituted according to the table above.

One of the problems encountered was courses that had multiple paths to having the prerequisites. For example, Calculus 2 has the prerequisites of Calculus 1 OR Calculus 1 for Science/Engineering. To help with this, when reading the frontend, courses that are on the same level are prerequisites for the course(s) above it. If they are the same shade of color, then this means that you need one of them from the same color group. This is represented in the backend JSON by having the prereqs property be an array of arrays, where to fulfill the requirements you need one class from each group. 

If you have any questions about this, feel free to contact me for more information. All the code is available on Github at https://github.com/joshcaron/Volans (Volans was the fun code name we came up for it during the hackathon). 

[Hack@Brown]: http://www.hackatbrown.org/
