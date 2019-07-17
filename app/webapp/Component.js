sap.ui.define([
    "sap/ui/core/UIComponent",
    "bookshop/app/model/models",
    "sap/ui/model/odata/v4/ODataModel"
], function (UIComponent, models, ODataModel) {
    "use strict";

    return UIComponent.extend("ui.Component", {

        metadata: {
            manifest: "json"
        },

        /**
         * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
         * @public
         * @override
         */
        init: function () {
            var oModel = new ODataModel({
                serviceUrl: this.isWindows() ? "/catalog/" : "/srv/catalog/",
                synchronizationMode: "None"
            });
            // set as default
            this.setModel(oModel);


            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");
        },

        absolutePath: function (href) {
            if (!this._link)
                this._link = document.createElement("a");

            this._link.href = href;
            return this._link.href;
        },

        isWindows: function () {
            var path = this.absolutePath("/");
            return path.lastIndexOf('http://localhost', 0) === 0;
        }
    });
});