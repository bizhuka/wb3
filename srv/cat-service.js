"use strict";

const Db = require('./util/Db');
const express = require('express');
const bodyParser = require("body-parser");

module.exports = function (srv) {
    const app = global.__express;

    // oData V2 wrapper
    const odatav2proxy = require("@sap/cds-odata-v2-adapter-proxy");
    app.use(odatav2proxy({port: process.env.PORT || 4004}));

    // Default folder
    const compression = require('compression');
    app.use(compression());
    app.use('/', express.static(__dirname + '/web'));

    const xsenv = require("@sap/xsenv");

    // Use xsuaa
    if (!Db.isTest()) {
        const xssec = require("@sap/xssec");
        const passport = require("passport");

        passport.use("JWT", new xssec.JWTStrategy(xsenv.getServices({
            uaa: {
                tag: "xsuaa"
            }
        }).uaa));
        app.use(passport.initialize());
        app.use(passport.authenticate("JWT", {session: false}));
    }

    // init hdi containers & rfc connections
    Db.readConnectionInfo(app);

    // DB - updates
    require('./api/db')(app, srv);

    // Update from CSV
    require('./api/csv')(app, srv);

    // Synchronization with R3
    require('./api/sync')(app, srv);

    // Information about current user
    require('./api/user_info')(app);

    // Wialon
    require('./api/wialon')(app, srv);

    // Select data from DB
    require('./api/select')(app, srv);

    // PDF & word
    require('./api/print')(app, srv);

    // PDF & word
    require('./api/closeWb')(app, srv);

    // runtime code
    require('./api/code')(app, srv);

    // other
    require('./api/other')(app, srv);
};