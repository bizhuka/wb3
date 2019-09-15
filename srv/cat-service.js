"use strict";

const Db = require('./util/Db');

module.exports = function (srv) {
    const express = global.__express;

    if(!Db.isTest()){
        const xsenv = require("@sap/xsenv");
        const xssec = require("@sap/xssec");
        const xsHDBConn = require("@sap/hdbext");
        const passport = require("passport");

        passport.use("JWT", new xssec.JWTStrategy(xsenv.getServices({
            uaa: {
                tag: "xsuaa"
            }
        }).uaa));
        express.use(passport.initialize());
        express.use(passport.authenticate("JWT", {session: false}));

        const hanaOptions = xsenv.getServices({
            hana: {
                plan: "hdi-shared"
            }
        });
        hanaOptions.hana.pooling = true;
        express.use(xsHDBConn.middleware(hanaOptions.hana));
    }
    
    // DB - updates
    require('./api/db')(express, srv);

    // Update from CSV
    require('./api/csv')(express, srv);

    // Synchronization with R3
    require('./api/sync')(express, srv);

    // Information about current user
    require('./api/user_info')(express);

    // Wialon
    require('./api/wialon')(express, srv);

    // Select data from DB
    require('./api/select')(express, srv);

    // PDF & word
    require('./api/print')(express, srv);

    // runtime code
    require('./api/code')(express, srv);

    // other
    require('./api/other')(express, srv);
};