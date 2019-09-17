sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/Filter",
    "sap/m/MessageToast",
    "com/modekzWaybill/model/models",
    "com/modekzWaybill/model/formatter",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/odata/ODataModel"
], function (UIComponent, Device, Filter, MessageToast, models, formatter, ODataV2, ODataV4, ODataModel) {
    "use strict";

    return UIComponent.extend("com.modekzWaybill.Component", {

        metadata: {
            manifest: "json"
        },

        metaData: {},

        readModel: null,

        /**
         * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
         * @public
         * @override
         */
        init: function () {
            var _this = this;

            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // var sServiceUrl = this.getMetadata().getManifestEntry("sap.app").dataSources.wb.uri;

            // create the views based on the url/hash
            this.getRouter().initialize();

            var oModel = null;

            if (!formatter.isNodeJs())
                oModel = new ODataV2({
                    serviceUrl: "/odata.svc/"
                });
            else {
                oModel = _this._createModelV4();

                // Read metadata
                oModel.getMetaModel().fetchData().then(function (metaData) {
                    for (var key in metaData)
                        if (metaData.hasOwnProperty(key) && key.indexOf('.') > 0) {
                            var entityName = key.split('.')[1];
                            if (!entityName || metaData[key].$kind !== "EntityType")
                                continue;

                            // copy fields description
                            _this.metaData[entityName] = metaData[key];
                        }
                });

                // For reading list data
                this.readModel = _this._createModelV4();
                this.readModel.setSizeLimit(2147483647);
            }

            // set as default ?
            this.setModel(oModel, "wb");
        },

        _createModelV4: function () {
            return new ODataV4({
                serviceUrl: formatter.isWindows() ? "/catalog/" : "/srv/catalog/"
                , synchronizationMode: "None"
                , operationMode: "Server"
                , groupId: formatter.isWindows() && formatter.isNodeJs() ? "$direct" : undefined
            })
        },

        readWrapper: function (entityName, filters, callback) {
            var _this = this;

            var oModel = _this.getModel("wb");
            if (oModel instanceof ODataV2) {
                oModel.read("/" + entityName, {
                    filters: filters,

                    success: function (odata) {
                        callback(null, odata.results);
                    },

                    error: function (text) {
                        callback(text);
                    }
                });
            } else {
                _this._checkFilter(_this.metaData[entityName], filters);
                var list = this.readModel.bindList("/" + entityName, undefined, undefined, filters);

                // TODO How to handle errors?
                list.attachDataReceived(function () {
                    var listData = list.getContexts();
                    var results = [];
                    var entity = _this.metaData[entityName];
                    for (var i = 0; i < listData.length; i++) {
                        var value = listData[i].getObject();

                        // transform dates
                        for (var field in entity)
                            if (entity.hasOwnProperty(field)) {
                                var lv_type = entity[field].$Type;
                                if (lv_type === "Edm.Date" || lv_type === "Edm.DateTimeOffset")
                                    value[field] = formatter.checkDate(value[field]);
                            }

                        // And add new value
                        results.push(value);
                    }

                    callback(null, results);
                });
                list.getContexts();
            }
        },

        _checkFilter: function (entity, filter) {
            if (!filter)
                return;

            if (filter instanceof Filter) {
                // Is date
                if (filter.oValue1 && filter.oValue1.getMonth)
                    filter.oValue1 = this.toTextDate(entity, filter.sPath, filter.oValue1);

                if (filter.oValue2 && filter.oValue2.getMonth)
                    filter.oValue2 = this.toTextDate(entity, filter.sPath, filter.oValue2);

                // Sub also filters
                if (filter.aFilters)
                    for (var f = 0; f < filter.aFilters.length; f++)
                        this._checkFilter(entity, filter.aFilters[f]);

                return;
            }

            // Process each item
            if (filter.length)
                for (var i = 0; i < filter.length; i++)
                    this._checkFilter(entity, filter[i]);
        },

        toTextDate: function (entity, field, value) {
            //Edm.DateTimeOffset
            value = value.toISOString();

            // Edm.Date
            if (entity[field].$Type === "Edm.Date")
                value = value.substr(0, 10);
            return value;
        },

        modifyWrapper: function (opration, path, value, callback) {
            var _this = this;
            var oModel = _this.getModel("wb");

            if (opration !== "UPDATE" && opration !== "CREATE" && opration !== "DELETE")
                throw ("Wrong parameter");

            if (oModel instanceof ODataV2) {
                switch (opration) {
                    case "UPDATE":
                        oModel.update(path, value, callback);
                        break;
                    case "CREATE":
                        oModel.create(path, value, callback);
                        break;
                    case "DELETE":
                        oModel.remove(path, callback);
                        break;
                }
            } else {
                var httpType = null;
                switch (opration) {
                    case "UPDATE":
                        httpType = 'PATCH';
                        break;
                    case "CREATE":
                        httpType = 'POST';
                        break;
                    case "DELETE":
                        httpType = 'DELETE';
                        break;
                }

                // Get entity name
                var pos = path.indexOf('(');
                var entityName = pos === -1 ? path.substr(1) : path.substr(1, pos - 1);
                var entity = _this.metaData[entityName];

                // Detect dates
                for (var key in value)
                    if (value.hasOwnProperty(key) && value[key] && value[key].getMonth)
                        value[key] = this.toTextDate(entity, key, value[key]);

                //console.warn(JSON.stringify(value))
                $.ajax({
                    type: httpType,
                    url: "catalog" + path,
                    data: value !== null ? JSON.stringify(value) : undefined,
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    success: function (result) {
                        callback.success(result);
                    },
                    error: function () {
                        if (callback.error)
                            callback.error();
                    }
                });
            }
        }
    });
});