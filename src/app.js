var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , fs = require("fs"),
	im = require("imagemagick");
	
// TODO: Stats? Probably just use google analytics or something, no need for a custom solution right now

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);

app.get("/:token", function(req, res, next){
	fs.exists("./public/images/" + req.params.token + ".jpg", function(exists){
		if(!exists)	
			res.send("not found: " + req.params.token); // TODO: Proper 404
		else
			res.render("single", {
				token: req.params.token,
				next: null, // TODO
				previous: null
			});
	});
});

app.post("/", function(req, res){

	var token = Math.floor(Math.random()*16777215).toString(16); // TODO: Generate better token

	var temp = req.files.file.path;
	var path = "./public/images/" + token;

	// TODO: Convert all to JPEGs
	// TODO: Strip metadata
	// TODO: Validate
	
	try {
		
		im.identify(temp, function(err, features){
			
			if(features.format == "JPEG"){
			
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

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

