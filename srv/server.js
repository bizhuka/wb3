/*eslint no-console: 0, no-unused-vars: 0*/
"use strict";

var cds = require("@sap/cds");
// var xsenv = require("@sap/xsenv");
// var xssec = require("@sap/xssec");
var express = require("express");
// var passport = require("passport");

var app = express();

app.use(express.json());

// passport.use("JWT", new xssec.JWTStrategy(xsenv.getServices({
// 	uaa: {
// 		tag: "xsuaa"
// 	}
// }).uaa));
// app.use(passport.initialize());
// app.use(
// 	passport.authenticate("JWT", {
// 		session: false
// 	})
// );

var options = {
	kind: "hana",
	logLevel: "error"
};
cds.connect(options);
cds.serve("gen/csn.json", {
		crashOnError: false
	})
	.at("/catalog")
	.with(require("./cat-service.js"))
	.in(app)
	.catch((err) => {
		console.log(err);
		process.exit(1);
	});



var server = require("http").createServer();
var port = process.env.PORT || 3000;

server.on("request", app);

server.listen(port, function () {
	console.info("srv: " + server.address().port);
});
