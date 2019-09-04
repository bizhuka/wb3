sap.ui.define([
        'sap/ui/base/Object',
        'sap/ui/model/Filter',
        'sap/ui/model/FilterOperator'
    ], function (Object, Filter, FilterOperator) {
        "use strict";

        return Object.extend("com.modekzWaybill.control.DriverDialog", {
            owner: null,
            driverDialog: null,
            params: null,
            table: null,

            constructor: function (owner) {
                this.owner = owner;
            },

            openDriverDialog: function (params) {
                var _this = this;
                _this.params = params;

                // Init
                if (!_this.driverDialog) {
                    _this.driverDialog = this.owner.createFragment("com.modekzWaybill.control.DriverDialog", this);

                    // sap.m.Table
                    _this.table = _this.owner.findById("id_driver_table");

                    // Get template
                    var template = _this.table.getBindingInfo("items").template;
                    _this.table.unbindAggregation("items");

                    // bind again
                    _this.table.bindItems({
                        path: params.bindPath,
                        template: template
                    });
                }

                // Filter and open
                _this.owner.findById("id_driver_search").setValue(params.text);
                _this.filterDrivers(params.text, params.bindBukrs, function (okFilter) {
                    _this.table.getBinding("items").filter(okFilter);
                    _this.driverDialog.open();
                });
            },

            onSearch: function (oEvent) {
                var _this = this;

                var text = oEvent.getParameter("query");
                _this.filterDrivers(text, _this.params.bindBukrs, function (okFilter) {
                    _this.table.getBinding("items").filter(okFilter);
                });
            },

            onSelectionChange: function (oEvent) {
                this.onDriverCloseDialog();
                this.params.confirmMethod.call(this.owner, oEvent);
            },

            onSyncDrivers: function () {
                var _this = this;
                _this.owner.updateDbFrom({
                    link: "/r3/DRIVER?_persist=true",

                    title: _this.owner.getBundle().getText("drivers"),

                    afterUpdate: function () {
                        _this.table.getBinding("items").refresh();
                    }
                });
            },

            onDriverCloseDialog: function () {
                if (this.driverDialog)
                    this.driverDialog.close();
            },

            onDriverAfterClose: function (oEvent) {
                this.driverDialog.destroy();
                this.driverDialog = null;
            },

            filterDrivers: function (text, bukrs, callback) {
                var _this = this;

                var andFilter = null;
                if (text) {
                    text = text.toUpperCase();
                    andFilter = new Filter({
                        filters: [
                            new Filter("Pernr", FilterOperator.Contains, text),
                            new Filter("Fio", FilterOperator.Contains, text),
                            new Filter("Post", FilterOperator.Contains, text),
                            new Filter("Podr", FilterOperator.Contains, text),
                            new Filter("Stcd3", FilterOperator.Contains, text),
                            new Filter("Barcode", FilterOperator.EQ, text)
                        ],
                        and: false
                    });
                }

                // Do not read user permissions
                if (bukrs) {
                    callback.call(_this.owner,
                        _this.owner.makeAndFilter(new Filter("Bukrs", FilterOperator.EQ, bukrs), andFilter));
                    return;
                }

                // Read user permissions
                _this.owner.filterItemsByUserBukrs({
                    field: "Bukrs",

                    and: andFilter,

                    ok: function (okFilter) {
                        callback.call(_this.owner, okFilter);
                    }
                });
            }
        });
    }
);