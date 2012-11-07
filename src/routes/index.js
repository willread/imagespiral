/*
 * GET home page.
 */
 
var fs = require("fs");

exports.index = function(req, res){
	
	fs.readdir("./public/images/", function(err, files){
		res.render("index", {
			files: files
		});
	});
};