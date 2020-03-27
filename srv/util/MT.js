"use strict";

const xsenv = require("@sap/xsenv");
const cdsLib = require("@sap/cds/lib/cds");
const cdsConnect = require("@sap/cds/lib/runtime/connect");

// for RFC
const Client = process.env.RFC_TEST === 'true' ? null : require('node-rfc').Client;

const Db = require('./Db');

// hdi-containers & rfc connections info
const connections = JSON.parse(process.env.WB_CONNECTIONS);

// for multi tenancy
let _subDomainPrefix = false;

module.exports = {

    getConnectionInfo: function (req) {
        // prefix key
        const key = Db.isWindows() ? "localhost:" : req.authInfo.subdomain;

        for (let i = 0; i < connections.length; i++) {
            const connection = connections[i];
            if (connection.prefix === key)
                return connection;
        }
        return null;
    },

    initialize: function (app) {
        // Set only one connection info
        const vcap = process.env.VCAP_SERVICES ? JSON.parse(process.env.VCAP_SERVICES) : {hana: []};

        for (let i = 0; i < connections.length; i++) {
            const connection = connections[i];

            console.log('#######################################');
            console.log('Looking for ' + connection.hdi_service);

            // For cds
            for (let h = 0; h < vcap.hana.length; h++) {
                const envHana = vcap.hana[h];
                if (envHana.name === connection.hdi_service) {
                    connection.envHana = {
                        use: 'hana',
                        kind: 'hana',
                        credentials: envHana.credentials,
                        model: 'gen/csn.json'
                    };

                    console.log('OK found =' + envHana.name);
                    console.log('#######################################');
                    break;
                }
            }

            // No option was found
            if (!connection.envHana)
                continue;

            const hanaOption = xsenv.getServices({
                hana: {
                    name: connection.hdi_service,
                    instance_name: connection.hdi_service,
                }
            }).hana;

            // For hana
            hanaOption.pooling = true;
            connection.hanaOption = hanaOption;
        }

        const _this = this;

        // @sap/hdbext.middleware TODO no need to change ?
        // app.use(_this.changeHDB());

        // What container to use
        app.use(function (req, res, next) {
            const connection = _this.getConnectionInfo(req);

            // Try to find in all mapped containers
            if (!connection) {
                next(new Error("Connection is not found!"));
                return;
            }

            _this.changeCDS(connection);
            next();
        });
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

    changeCDS: function (connection) {
        const prefix = connection.prefix;
        if (Db.isWindows() || prefix === _subDomainPrefix)
            return;

        console.log('trying to connect ' + prefix);

        // No need to disconnect @see require("@sap/cds-ql/lib/connect/Service") eviction rules;
        // cdsLib.disconnect();

        // cdsLib.connect(connection.envHana);
        // cdsLib.db = cdsLib.services.db = cdsConnect.db(connection.envHana);
        // cdsLib.db = cdsLib.services.db = cdsConnect.to('db', connection.envHana, true);

        // 3-d parameter (___primary) is critical
        cdsLib.db = cdsLib.services.db = cdsConnect.to(connection.envHana, undefined, false);

        console.log('connected to ' + prefix, connection.envHana.credentials.schema);
        _subDomainPrefix = prefix;
    },

    // @sap/hdbext.middleware
    changeHDB: function () {
        const hdbext = require("@sap/hdbext");
        const connOptions = hdbext.connectionOptions;
        const createConnection = hdbext.createConnection;
        const _ = require('lodash');

        const _this = this;

        return function db(req, res, next) {
            // const authInfo = req.authInfo;
            // delete req.authInfo;

            // get hdi container info from process.env
            const hanaOption = _this.getConnectionInfo(req).hanaOption;

            const globalOptions = _.extend({}, connOptions.getGlobalOptions(), hanaOption);
            const requestOptions = connOptions.getRequestOptions(req);
            const options = _.extend({}, globalOptions, requestOptions);

            // TODO standard authentication fails
            delete options['sessionVariable:XS_APPLICATIONUSER'];

            // use login & password
            options.serverNode = hanaOption.host + ":" + hanaOption.port;
            options.encrypt = true;
            options.uid = hanaOption.user;
            options.pwd = hanaOption.password;

            createConnection(options, function (err, client) {
                // req.authInfo = authInfo;

                if (err) {
                    err.status = 500;
                    console.error('---createConnection---');
                    console.error(err);
                    return next(err);
                }

                // Change db client
                req.db = client;
                client.exec("SET SCHEMA " + hanaOption.schema);
                // client.exec('SELECT * FROM __', function (err, rows) {
                //     if (err) throw err;
                //     console.log('Rows:', rows);
                // });

                const end = res.end;
                res.end = function () {
                    const resEndArgs = arguments;

                    req.db.close(function (err) {
                        if (err) {
                            console.error('---req.db.close---');
                            console.error('Error while closing connection.', err);
                        }
                        delete req.db;
                        res.end = end;
                        res.end.apply(res, resEndArgs);
                    });
                };

                next();
            });
        };
    }
};