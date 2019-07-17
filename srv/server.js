/*eslint no-console: 0, no-unused-vars: 0*/
"use strict";

var cds = require("@sap/cds");
// var cdsLib = require("@sap/cds/lib/cds");
var express = require("express");

// var xsenv = require("@sap/xsenv");
// var xssec = require("@sap/xssec");
// var passport = require("passport");

async function start() {
    var app = express();
    global.__express = app;

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

    const options = process.platform === 'win32' ?
        {
            kind: "sqlite",
            logLevel: "error",
            credentials: {
                database: "../db/wb.db"
            }
        } :
        {
            kind: "hana",
            logLevel: "error"
        };

    await cds.connect(options);
    const srv = await  cds.serve("gen/csn.json", {
        crashOnError: false
    }).at("/catalog")
        .with(require("./cat-service.js"))
        .in(app)
        .catch((err) => {
            console.log(err);
            process.exit(1);
        });


    var server = require("http").createServer();
    var port = process.env.PORT || 4004;

    server.on("request", app);
    server.listen(port, function () {
        console.info("srv: " + server.address().port);
    });

    return true;
}

start();