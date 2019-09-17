sap.ui.define([
        'sap/ui/base/Object',
        'sap/ui/model/Filter',
        'sap/ui/model/FilterOperator'
    ], function (BaseObject, Filter, FilterOperator) {
        "use strict";

        return BaseObject.extend("com.modekzWaybill.control.LgortDialog", {
            owner: null,
            lgortDialog: null,
            params: null,
            table: null,

            constructor: function (owner) {
                this.owner = owner;
            },

            openLgortDialog: function (params) {
                var _this = this;
                _this.params = params;

                // Init
                if (!_this.lgortDialog) {
                    _this.lgortDialog = this.owner.createFragment("com.modekzWaybill.control.LgortDialog", this);

                    // sap.m.Table
                    _this.table = _this.owner.findById("id_lgort_table");
                }

                // Filter and open
                _this.owner.findById("id_lgort_search").setValue(params.lgort);

                _this.filterLgorts(params.lgort, params.werks, function (lgortFilter) {
                    _this.table.getBinding("items").filter(lgortFilter);
                    _this.lgortDialog.open();
                });
            },

            lgortSearch: function (oEvent) {
                var _this = this;

                var text = oEvent.getParameter("query");
                _this.filterLgorts(text, _this.params.werks, function (okFilter) {
                    _this.table.getBinding("items").filter(okFilter);
                });
            },

            onSelectionChange: function (oEvent) {
                this.onLgortCloseDialog();
                this.params.confirmLgort.call(this.owner, oEvent);
            },

            onSyncLgorts: function () {
                var _this = this;
                _this.owner.updateDbFrom({
                    link: "/r3/LGORT?_persist=true",

                    title: _this.owner.getBundle().getText("lgorts"),

                    afterUpdate: function () {
                        _this.table.getBinding("items").refresh();
                    }
                });
            },

            onLgortCloseDialog: function () {
                if (this.lgortDialog)
                    this.lgortDialog.close();
            },

            onLgortAfterClose: function () {
                this.lgortDialog.destroy();
                this.lgortDialog = null;
            },

            filterLgorts: function (text, werks, callback) {
                var _this = this;

                var textFilter = null;
                if (text) {
                    textFilter = new Filter({
                        filters: [
                            new Filter("Werks", FilterOperator.Contains, text),
                            new Filter("Lgort", FilterOperator.Contains, text),
                            new Filter("Lgobe", FilterOperator.Contains, text)
                        ],
                        and: false
                    });
                }

                // Do not read user permissions
                callback.call(_this.owner,
                    _this.owner.makeAndFilter(
                        new Filter("Werks", FilterOperator.EQ, werks),
                        textFilter));
            }
        });
    }
);