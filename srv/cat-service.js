"use strict";

const Db = require('./util/Db');
const express = require('express');

module.exports = function (srv) {
    const app = global.__express;

    // Default folder
    app.use('/', express.static(__dirname + '/web'));

    if (!Db.isTest()) {
        const xsenv = require("@sap/xsenv");
        const xssec = require("@sap/xssec");
        const xsHDBConn = require("@sap/hdbext");
        const passport = require("passport");

        passport.use("JWT", new xssec.JWTStrategy(xsenv.getServices({
            uaa: {
                tag: "xsuaa"
            }
        }).uaa));
        app.use(passport.initialize());
        app.use(passport.authenticate("JWT", {session: false}));

        const hanaOptions = xsenv.getServices({
            hana: {
                plan: "hdi-shared"
            }
        });
        hanaOptions.hana.pooling = true;
        app.use(xsHDBConn.middleware(hanaOptions.hana));
    }

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

    // runtime code
    require('./api/code')(app, srv);

    // other
    require('./api/other')(app, srv);
};