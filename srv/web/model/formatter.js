sap.ui.define([], function () {
    "use strict";

    return {

        getUrl: function (relPath) {
            // if (this.isNodeJs())
            //     return "/" + relPath;
            return relPath;
        },

        absolutePath: function (href) {
            if (!this._link)
                this._link = document.createElement("a");

            this._link.href = href;
            return this._link.href;
        },

        _isNode: null,
        isNodeJs: function () {
            if (this._isNode === null) {
                var path = this.absolutePath("/");

                // Java
                if (path.indexOf("wb-router") > 0 || path.indexOf("http://localhost:8080") === 0)
                    this._isNode = false;
                // Node js
                else if (path.indexOf("wb3-") > 0 || path.indexOf("http://localhost:4004") === 0 || path.indexOf("https://hxehost") === 0)
                    this._isNode = true;
                else
                    throw "isNodeJs() Unknown host";
            }

            return this._isNode;
        },

        _isWindows: null,
        isWindows: function () {
            if (this._isWindows === null)
                this._isWindows = this.absolutePath("/").indexOf('http://localhost') === 0;
            return this._isWindows;
        },

        getLongPostfix: function () {
            return this.isNodeJs() ? "" : "L";
        },

        checkDate: function (date) {
            if (!date || date.getMonth)
                return date;
            return new Date(date);
        }
    };
});