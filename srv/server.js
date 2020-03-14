/*eslint no-console: 0, no-unused-vars: 0*/
"use strict";

// const Db = require('./util/Db');
// const cds = require("@sap/cds");
// const express = require("express");
//
// if (Db.isWindows()) {
//     // Save in global var
//     const app = express();
//     global.__express = app;
//
//     cds.connect({
//         kind: "sqlite", // hana
//         logLevel: "debug",
//         credentials: {
//             database: "../db/wb.db"
//         }
//     });
//     cds.serve("gen/csn.json", {
//         crashOnError: false
//     }).at("/catalog")
//         .with(require("./cat-service.js"))
//         .in(app)
//         .catch((err) => {
//             console.log(err);
//             process.exit(1);
//         });
//
//     const server = require("http").createServer();
//     const port = process.env.PORT || 4004;
//
//     server.on("request", app);
//     server.listen(port, function () {
//         console.info("srv: " + server.address().port);
//     });
// } else {
    const cds_bin = require("@sap/cds/bin/cds");
    cds_bin('serve', 'gen/csn.json', '--at', '/catalog', '--with', require("./cat-service.js"));
// }