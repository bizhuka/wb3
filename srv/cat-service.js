"use strict";

module.exports = function (srv) {
    // DB - updates
    require('./api/db')(global.__express, srv);

    // Update from CSV
    require('./api/csv')(global.__express, srv);

    // Synchronization with R3
    require('./api/sync')(global.__express, srv);

    // Information about current user
    require('./api/user_info')(global.__express);

    // Wialon
    require('./api/wialon')(global.__express, srv);

    // Select data from DB
    require('./api/select')(global.__express, srv);

    // PDF & word
    require('./api/print')(global.__express, srv);

    // runtime code
    require('./api/code')(global.__express, srv);

    // other
    require('./api/other')(global.__express, srv);
};