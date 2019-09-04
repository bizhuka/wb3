module.exports = {

    // From js 1 seconds
    isNow: function (value) {
        return value === "1970-01-01T00:00:00.001Z" || value === "0001-01-01T00:00:01.000Z";
    },

    getNow: function () {
        return (new Date()).toISOString()
    },

    // return YYYY-MM-DD
    getSqlDate: function (d) {
        // From SAP date
        if (typeof d === 'string' && d.length === 8)
            return d.substr(0, 4) + '-' + d.substr(4, 2) + '-' + d.substr(6, 2);

        return d.toISOString().substr(0, 10)
    },

    // TODO check date offset
    getSqlDateTime: function (d) {
        if (!d)
            return null;
        return (new Date(d)).toISOString().substr(0, 19) + '.033Z';
    }
};