var config = require("./config/config");

var express = require("express");
var routes = require("./routes");
var user = require("./routes/user");
var http = require("http");
var path = require("path");
var fs = require("fs");
var im = require("imagemagick");
var email = require("emailjs/email");
	
// Initialize app
	
var app = express();

// Connect to email server

var emailServer = email.server.connect({
	host: config.smtp.host,
	user: config.smtp.user,
	password: config.smtp.password,
	ssl: config.smtp.ssl == "true" ? true : false
});

/*
 *
 * App configurations
 *
 */

app.configure(function(){
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	
	// Misc helpers
	
	app.use(function(req, res, next){
		res.locals.config = config;
		res.locals.date = new Date();
		next();
	});
	
	app.use(express.cookieParser("I aM A ReaLLy DiffiCulT TO GueSS SecReT"));
	app.use(express.session());
	app.use(require('less-middleware')({ src: __dirname + '/public' }));
	app.use(express.static(path.join(__dirname, 'public')));
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

/*
 *
 * Misc Routes
 *
 */

app.get('/', routes.index);
app.get('/users', user.list);

app.get('/tos', function(req, res){
	res.render("tos");
});

app.get("/reported", function(req, res){
	res.render("reported");
});

/*
 *
 * Report images
 *
 */

app.get('/report', function(req, res){
	res.render("report");
});

app.post("/report", function(req, res){
	emailServer.send({
		// TODO: Cleanse inputs
		text: req.body.url + "\n\n" + req.body.reason,
		from: config.name + " Reports <" + config.reportEmail + ">",
		to: config.reportEmail,
		subject: "Reported Image"
	}, function(err, message){
	})
	res.redirect("/reported");
});

/*
 *
 * Single image view
 *
 */

app.get("/:token", function(req, res, next){
	fs.exists("./public/images/" + req.params.token + ".jpg", function(exists){
		if(!exists)	
			res.send("not found"); // TODO: Proper 404
		else
			res.render("single", {
				token: req.params.token,
				next: null, // TODO
				previous: null
			});
	});
});

/*
 *
 * Handle image uploads
 *
 */

app.post("/", function(req, res){
	var token = Math.floor(Math.random()*16777215).toString(16); // TODO: Generate better token

	var temp = req.files.file.path;
	var path = "./public/images/" + token;

	// TODO: Convert all to JPEGs
	// TODO: Strip metadata
	// TODO: Validate
	
	try {
		
		im.identify(temp, function(err, features){
			
			if(features && features.format == "JPEG"){
			
				im.crop({
					srcPath: temp,
					dstPath: "./public/thumbs/" + token + ".jpg",
					width: 150,
					height: 150,
					quality: 1,
					gravity: "Center"
				}, function(err, stdout, stderr){
					if(err) throw err;
					console.log(arguments);
					fs.rename(temp, path + ".jpg", function(err){
						if(err) throw err;
						
						res.redirect("/" + token);
					})	
				});
			
			}else{
			
				res.send("error"); // FIXME
			
			}
			
		});
	
	}catch(err){
		console.log("err: " + err);
	}
});

/*
 *
 * Start the server!
 *
 */

http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});

