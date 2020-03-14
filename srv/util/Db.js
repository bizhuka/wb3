const path = require('path');

module.exports = {

    close: function (tx, doCommit) {
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

    initialize: function (app) {
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

        // For checking connections errors
        app.use(function (err, req, res, next) {
            console.error('readConnectionInfo=', err);
            console.error(err.stack);
        });
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