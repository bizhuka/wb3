module.exports = {
    // From js 1 seconds
    C_NOW: "0001-01-01T00:00:01.000Z",

    getNow: function () {
        return (new Date()).toISOString()
    },

    getSqlDate: function (d) {
        return d.toISOString().substr(0, 10)
    }
};