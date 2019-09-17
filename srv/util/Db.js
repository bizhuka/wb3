
const path = require('path');

module.exports = {

    close: async function (tx, doCommit) {
        if (doCommit || this.isWindows()) // SQLITE !
            await tx.commit(true);
    },

    isTest: function () {
        return !!process.env.WB_IS_TEST;
    },

    isWindows: function () {
        return process.platform === 'win32';
    },

    getFilePath: function (relPath) {
        return path.resolve('./srv/web/' + relPath);
    }
};