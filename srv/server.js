/*eslint no-console: 0, no-unused-vars: 0*/
"use strict";

const Db = require('util/Db');
const cds = require("@sap/cds");
const express = require("express");

const xsenv = require("@sap/xsenv");
const xssec = require("@sap/xssec");
const passport = require("passport");

async function start() {
    // Save in global var
    const app = express();
    global.__express = app;

    // Security options
    if (!Db.isTest()) {
        passport.use("JWT", new xssec.JWTStrategy(xsenv.getServices({
            uaa: {
                tag: "xsuaa"
            }
        }).uaa));
        app.use(passport.initialize());
        app.use(passport.authenticate("JWT", {session: false}));
    }

    const options = Db.isWindows() ?
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


    const server = require("http").createServer();
    const port = process.env.PORT || 4004;

    server.on("request", app);
    server.listen(port, function () {
        console.info("srv: " + server.address().port);
    });

    return true;
}

start();