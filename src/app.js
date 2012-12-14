var config = require("./config/config");

var express = require("express");
var routes = require("./routes");
var user = require("./routes/user");
var http = require("http");
var path = require("path");
var fs = require("fs");
var email = require("emailjs/email");
var sys = require('sys')
var exec = require('child_process').exec;
var cluster = require("cluster");
var redis = require("redis");
var RedisStore = require('connect-redis')(express);
var skip32 = new require("skip32").Skip32;
skip32 = new skip32([0x9b, 0x21, 0x96, 0xe, 0x1a, 0xcf, 0x24, 0x5f, 0x14, 0x93]);
var passwordHash = require('password-hash');
var flash = require('connect-flash');
var glob = require("glob");
	
// Initialize app
	
var app = express();

// Setup authentication
// Setup redis

var redisClient = redis.createClient();

redisClient.on("error", function (err) {
    console.log("Redis error: " + err);
});

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
	
	app.use(express.cookieParser());
	app.use(express.session({
		secret: "I aM A ReaLLy DiffiCulT TO GueSS SecReT",
		store: new RedisStore({})
	}));
	app.use(flash());
	app.use(require('less-middleware')({ src: __dirname + '/public' }));
	app.use(express.static(path.join(__dirname, 'public')));
	app.use(express.favicon());
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

app.get('/tos', function(req, res){
	res.render("tos");
});

app.get('/test', function(req, res){
	res.render("test");
});

app.get("/reported", function(req, res){
	res.render("reported");
});

/*
 *
 * Handle session management
 *
 */
 
app.get("/login", function(req, res){
	res.render("login", {
		error: req.flash("error")
	});
});

app.post("/login", function(req, res){
	redisClient.hgetall("user:"+req.body.user, function(err, user){
		if(!user){
			req.flash("error", "Invalid user or password");
			res.redirect("/login");
		}else{
			if(!passwordHash.verify(req.body.password, user.password)){
				req.flash("error", "Invalid user or password");
				res.redirect("/login");
			}else{
				req.session.user = user;
				res.redirect("/account");			
			}
		}
	});
});

app.get("/logout", function(req, res){
	delete(req.session.user);
	res.redirect("/"); // FIXME
});

app.get("/register", function(req, res){
	res.render("register", {
		error: req.flash("error")
	});
});

app.post("/register", function(req, res){
	redisClient.hgetall("user:"+req.body.user, function(err, user){
		if(user){
			req.flash("error", "User already exists");
			res.redirect("/register");
		}else{
			if(req.body.password.length < config.minPasswordLength){
				req.flash("error", "Password must be at least " + config.minPasswordLength + " characters long");
				res.redirect("/register");
			}else{
				if(!req.body.user.match(/\S+@\S+/)){
					req.flash("error", "Invalid email address");
					res.redirect("/register");
				}else{
					redisClient.hmset("user:"+req.body.user, {
						"user": req.body.user,
						"password": passwordHash.generate(req.body.password)
					}, function(err, user){
						// FIXME: User created
						res.redirect("/registered");
					});
				}
			}
		}
	});
});

app.get("/registered", function(req, res){
	res.render("registered");
});

app.get("/password-reset/:token", function(req, res){
	res.render("new-password", {
		token: req.params.token,
		error: req.flash("error")
	});
});

app.post("/new-password", function(req, res){
	redisClient.hgetall("user:"+req.body.user, function(err, user){
		if(!user || user.token != req.body.token){
			req.flash("error", "Invalid token");
			res.redirect("/login");
		}else{
			if(req.body.password.length < config.minPasswordLength){
				req.flash("error", "Password must be at least " + config.minPasswordLength + " characters long");
				res.redirect("/password-reset/"+req.body.token);
			}else{
				redisClient.hmset("user:"+req.body.user, {
					token: "",
					password: passwordHash.generate(req.body.password)
				});
				req.flash("error", "You can now log in with your new password");
				res.redirect("/login");
			}
		}
	});
	req.params.user;
	req.params.token;
	req.params.password;
});

app.get("/password-reset", function(req, res){
	res.render("password-reset", {
		error: req.flash("error")
	});
});

app.post("/password-reset", function(req, res){
	redisClient.hgetall("user:"+req.body.user, function(err, user){
		if(user){
			var token = Math.floor(Math.random() * 33554432).toString(16);
			redisClient.hmset("user:"+req.body.user, {
				"token": token
			}, function(err){
				if(!err){
					emailServer.send({
						text: "http://" + config.domain + "/password-reset/" + token,
						from: config.name + " <noreply@" + config.domain + ">",
						to: user.user,
						subject: "Password Reset"
					}, function(err, message){
						 // ?
					})
				}
			});
		}
	});
	res.redirect("/password-reset-sent");
});

app.get("/password-reset-sent", function(req, res){
	res.render("password-reset-sent");
});

/*
 *
 * Member section
 *
 */
 
 app.get("/account", function(req, res){
 	if(!req.session.user){
 		res.redirect("/login");
 	}else{
 		redisClient.smembers("user:"+req.session.user.user+":images", function(err, images){
		 	res.render("account", {
		 		user: req.session.user,
		 		images: images
		 	});
 		});
 	}
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
		if(!exists){
			fs.exists("./public/images/" + req.params.token + "-0.jpg", function(exists){
				if(!exists){
					res.send("not found"); // TODO: Proper 404
				}else{
					glob("./public/images/" + req.params.token + "-*.jpg", function(err, files){
						res.render("gallery", {
							token: req.params.token,
							images: files
						});
					});
				}
			});
		}else{
			if(req.params.token.indexOf("-") > -1){
				var subtoken = req.params.token.split("-")[0];
				var num = parseInt(req.params.token.split("-")[1]);
				glob("./public/images/" + subtoken + "-*.jpg", function(err, files){
					if(err || !files || files.length < 1){
						res.send("gallery not found"); // TODO: Proper 404
					}else{
						res.render("gallery-single", {
							token: req.params.token,
							subtoken: subtoken,
							images: files,
							next: num < files.length - 1 ? num + 1 : -1,
							previous : num > 0 ? num - 1 : -1
						});
					}
				});
			}else{
				// redisClient.incr("image:" + req.params.token + ":count", function(err, count){
					res.render("single", {
						token: req.params.token,
						// count: count,
						// next: null, // TODO
						// previous: null // TODO
					});			
				// });
			}
		}
	});
});

/*
 *
 * Handle image uploads
 *
 */
 
var generateToken = function(callback){
	
	redisClient.incr("images:id", function(err, id){
		
		id = skip32.encrypt(id).toString(16);
		callback(id);
		
	});
 
}

var processFile = function(req, res, token, index){

	console.log("processing image " + token + " / " + index);
	
	var isGallery = req.files.files[0].length > 1;

	var temp = req.files.files[0][index].path;
	var name = !isGallery ? token : token + "-" + index;
	
	var thumbnailSize;

	for(var size in config.thumbnailSizes)
		if(config.thumbnailSizes[size] == req.body["thumbnail-size"]) thumbnailSize = config.thumbnailSizes[size];

	if(!thumbnailSize) thumbnailSize = config.thumbnailSizes[0];
	
	if(!temp){
		// FIXME res.send("error: file failed to upload");
		console.log("file failed to upload");
	}else{
		fs.stat(temp, function(err, stats){
			if(stats.size > config.maxFileSize * 1024 * 1024){
				// FIXME res.send("error: file is too large");
				console.log("file is too large");
			}else{
				exec("convert " + temp + " -strip -thumbnail " + thumbnailSize + " " + "./public/small/" + name + ".jpg", function (error, stdout, stderr){
					fs.exists("./public/small/" + name + ".jpg", function(exists){
						if(exists){
							exec("convert " + temp + " -strip -thumbnail 600x600 " + "./public/thumbs/" + name + ".jpg", function (error, stdout, stderr){
								exec("convert " + temp + " -strip " + "./public/images/" + name + ".jpg", function (error, stdout, stderr){								
									exec("convert " + temp + " -strip -thumbnail 85x85^ -gravity center -crop 85x85+0+0 +repage " + "./public/tiny/" + name + ".jpg", function (error, stdout, stderr){
										if(req.session.user){
											redisClient.sadd("user:"+req.session.user.user+":images", name);
										}
										
										if(req.files.files[0][index + 1])
											processFile(req, res, token, index + 1);
										else
											res.redirect("/" + token + (req.files.files[0].length > 1 ? "-0" : ""));
									});
								});
							});
						}else{
							// FIXME: res.send("error: invalid image");
							console.log("invalid image");
						}
					});
				});
			}
		})
	
	}

}

app.post("/", function(req, res){

	generateToken(function(token){
		
		if(!req.files.files){
			res.send("error: no files");
		}else{
			
			if(req.files.files[0].path)
				req.files.files[0] = [req.files.files[0]];
				
				console.log(req.files.files[0]);
			
			processFile(req, res, token, 0);
				
		}
		
	
	});

});

/*
 *
 * Start the server!
 *
 */
 
var cpus = require("os").cpus().length;

if(cluster.isMaster){

	// Fork
	
	for(var ii = 0; ii <cpus; ii++){
		cluster.fork();
	}
	
	cluster.on("exit", function(worker, code, signal){
		console.log("worker " + worker.process.pid + " died");
		cluster.fork(); // Restart
	});
	
	cluster.on("online", function(worker){
		console.log("worker " + worker.process.pid + " online");
	});

}else{

	http.createServer(app).listen(app.get('port'), function(){
		console.log("Express server listening on port " + app.get('port'));
	});	

}

