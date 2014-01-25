var engines = require('consolidate');

// Setup the server
var application_root = __dirname,
    express = require("express"),
    path = require("path");
    
// Configure the server
var app = express();
app.engine('html', engines.hogan);
app.configure(function () {
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(application_root, "public")));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

var router = require("./router.js");
router.setup(app);

// Launch server
app.listen(8888);
