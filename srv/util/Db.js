const path = require('path');

// hdi-containers & rfc connections info
const connections = JSON.parse(process.env.WB_CONNECTIONS);

// for RFC
const Client = require('node-rfc').Client;

module.exports = {

    close: function (tx, doCommit) {
        console.trace("commit=", doCommit);
        try {
            // if (doCommit || this.isWindows()) // SQLITE !
            tx.commit(true);
        } catch (e) {
            console.error("close=", e);
            console.error(e.stack);
        }
    },

    isTest: function () {
        return process.env.WB_IS_TEST === 'true';
    },

    isWindows: function () {
        return process.platform === 'win32';
    },

    getConnectionInfo: function (req) {
        // prefix key
        const key = this.isWindows() ? "localhost:" : req.authInfo.subdomain;

        for (let i = 0; i < connections.length; i++) {
            const connection = connections[i];
            if (connection.prefix === key)
                return connection;
        }
        return null;
    },

    readConnectionInfo: function (app) {
        const _this = this;

        // For checking connections errors
        app.use(function (err, req, res, next) {
            console.error('readConnectionInfo=', err);
            console.error(err.stack);
        });

        // Fill map
        const xsenv = require("@sap/xsenv");
        for (let i = 0; i < connections.length; i++) {
            const connection = connections[i];

            // Improve Application Performance
            if (connection.hdi_service && !this.isWindows()) {
                connection.hdi_service = xsenv.getServices({
                    search_info: {
                        name: connection.hdi_service
                    }
                }).search_info;

                connection.hdi_service.pooling = true;
            }
        }

        // subscribe/onboard a subscriber tenant
        app.put("/callback/v1.0/tenants/*", function (req, res) {
            const tenantAppURL = "https:\/\/"
                + req.body.subscribedSubdomain // "subaccount-embrdv" //
                + "-wb3-app" + ".cfapps.eu10.hana.ondemand.com";
            res.status(200).send(tenantAppURL);
        });

        // unsubscribe/offboard a subscriber tenant
        app.delete("/callback/v1.0/tenants/*", function (req, res) {
            res.status(200).send("");
        });

        // No need
        if (_this.isWindows())
            return;

        // What container to use
        app.use(function (req, res, next) {
            const connection = _this.getConnectionInfo(req);

            // Try to find in all mapped containers
            if (!connection) {
                next(new Error("Connection is not found!"));
                return;
            }

            // call hdbext middleware     const xsHDBConn = require("@sap/hdbext");
            _this.middleware(connection.hdi_service)(req, res, next);
        });
    },

    // copied from xsHDBConn.middleware
    middleware: function middleware(hanaService) {
        const _ = require('lodash');
        const debug = require('debug')('hdbext:middleware');
        const connOptions = require("@sap/hdbext/lib/conn-options");
        const clientFactory = require("@sap/hdbext/lib/client-factory");

        const globalOptions = _.extend({}, connOptions.getGlobalOptions(), hanaService);

        return function db(req, res, next) {
            const requestOptions = connOptions.getRequestOptions(req);

            const options = _.extend({}, globalOptions, requestOptions);

            // TODO check. delete standard field
            delete options['sessionVariable:XS_APPLICATIONUSER'];

            clientFactory.createConnection(options, function (err, client) {
                if (err) {
                    err.status = 500;
                    console.error(err);
                    return next(err);
                }

                req.db = client;

                const end = res.end;
                res.end = function () {
                    const resEndArgs = arguments;

                    debug('Cleanup triggered');
                    req.db.close(function (err) {
                        if (err) {
                            debug('Error while closing connection.', err);
                        }
                        delete req.db;
                        res.end = end;
                        res.end.apply(res, resEndArgs);
                    });
                };

                next();
            });
        };
    },

    getRfcClient: async function (req) {
        const sapSystem = this.getConnectionInfo(req).sap_dest;

        // Always new ?
        try {
            const rfcClient = new Client(sapSystem);
            await rfcClient.open();
            return rfcClient;
        } catch (e) {
            console.error("getRfcClient=", e);
        }
        return null;
    },

    getFilePath: function (relPath) {
        return path.resolve(__dirname, '../web/' + relPath);
    },

    readProperty: function (item, property) {
        if (item[property] === undefined)
            return item[property.toUpperCase()];

        return item[property];
    }
};