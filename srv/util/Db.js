const path = require('path');

module.exports = {

    close: function (tx, doCommit) {
        console.trace("commit=", doCommit);
        try {
            // if (doCommit || this.isWindows()) // SQLITE !
            tx.commit(true);
        } catch (e) {
            console.error(e.stack);
        }
    },

    isTest: function () {
        return process.env.WB_IS_TEST === 'true';
    },

    isWindows: function () {
        return process.platform === 'win32';
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