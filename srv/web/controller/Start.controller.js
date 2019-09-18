sap.ui.define([
    'com/modekzWaybill/controller/BaseController',
    'sap/ui/core/UIComponent',
    'sap/m/MessageToast',
    'sap/m/SelectDialog',
    'sap/ui/model/json/JSONModel',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'com/modekzWaybill/model/formatter'
], function (BaseController, UIComponent, MessageToast, SelectDialog, JSONModel, Filter, FilterOperator, formatter) {
    "use strict";

    return BaseController.extend("com.modekzWaybill.controller.Start", {

        onInit: function () {
            // call base init
            BaseController.prototype.onInit.apply(this, arguments);

            this.getRouter().getRoute("main").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function () {
            this.getModel("appView").setProperty("/appWidthLimited", true);

            this.countTile({
                model: "wbTile",
                url: "/count/wb",
                texts: "statusTexts",
                tileStatus: this.status.CREATED
            });

            this.countTile({
                model: "reqTile",
                url: "/count/req",
                texts: "reqStatusTexts",
                tileStatus: this.status.RC_NEW,
                textRes: this.status.RC_STATUS
            });
        },

        countTile: function (params) {
            var _this = this;
            var status = _this.status;

            var data = {
                busy: true,
                count: 0,
                tooltip: ""
            };
            var dataModel = new JSONModel(data);
            this.setModel(dataModel, params.model);

            // After counting
            var fnComplete = function () {
                data.busy = false;
                var items = jsonModel.getProperty("/");
                data.tooltip = _this.toLocaleDateTime(new Date());
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    if (item.status === params.tileStatus)
                        data.count = item.cnt;

                    // WB or REQ
                    var name = params.model === "wbTile" ? status.WB_STATUS : item.status < 0 ? status.RR_STATUS : status.RC_STATUS;
                    var row = status.findStatus(name, item.status);
                    if (row && row.inTile)
                        data.tooltip += "\n" + row.text + " - " + item.cnt;
                }

                // Update ui
                dataModel.setProperty("/", data);
            };

            var jsonModel = new JSONModel(params.url);
            jsonModel.attachRequestFailed(fnComplete);
            jsonModel.attachRequestCompleted(fnComplete);
        },

        showToroRequest: function () {
            this.doNavTo("toroRequest");
        },


        showFinishedReqs: function () {
            this.doNavTo("finishedReqs");
        },

        showWayill: function () {
            this.doNavTo("waybill");
        },

        importR3Tables: function () {
            this.getRouter().navTo("importR3");
        },

        doNavTo: function (path) {
            this.getModel("appView").setProperty("/appWidthLimited", false);
            this.getRouter().navTo(path);
        },

        setDriverValidDate: function () {
            var _this = this;

            // Load async
            sap.ui.require(["com/modekzWaybill/control/DriverDialog"], function (DriverDialog) {
                if (!_this._driverDialog)
                    _this._driverDialog = new DriverDialog(_this);

                _this._driverDialog.openDriverDialog({
                    bindPath: "wb>/Drivers",

                    text: "",

                    confirmMethod: function (oEvent) {
                        var context = oEvent.getParameter("listItem").getBindingContext("wb");
                        var oDriver = context.getObject();

                        _this.getOwnerComponent().modifyWrapper('UPDATE', context.getPath(),
                            {
                                ValidDate: new Date(1)
                            }, {
                                success: function () {
                                    MessageToast.show(_this.getBundle().getText("okDriverUpdate", [oDriver.Fio, oDriver.Bukrs]));
                                },
                                error: function (err) {
                                    _this.showError(err, _this.getBundle().getText("errUpdate"));
                                }
                            });
                    }
                });
            });
        },

        showPdfTemplates: function () {
            if (!this._pdfDiaolog) {
                this._pdfDiaolog = this.createFragment("com.modekzWaybill.view.frag.SelectPdfDialog");
                this._pdfDiaolog.setModel(new JSONModel(formatter.getUrl('/json/pdfBlanks.json')));
            }
            this._pdfDiaolog.open();
        },

        pdfSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter(
                new Filter({
                    filters: [
                        new Filter("Title", FilterOperator.Contains, sValue),
                        new Filter("Desc", FilterOperator.Contains, sValue),
                        new Filter("Info", FilterOperator.Contains, sValue)],
                    and: false
                })
            );
        },

        pdfClose: function (oEvent) {
            var aContexts = oEvent.getParameter("selectedContexts");
            if (!aContexts || !aContexts.length)
                return;

            this.navToPost({
                url: "/print/template?",
                objid: aContexts[0].getObject().Id,
                contentType: "application/pdf"
            })
        },

        openAnalytics: function () {
            window.open('https://erp-service.eu1.sapanalytics.cloud/sap/fpa/ui/tenants/009/app.html#;view_id=contentLib;tab=MyFiles', '_blank');
        },

        showUserInfo: function () {
            window.open('https://erp-service.accounts.ondemand.com/ui/protected/profilemanagement');
        },

        showDocumentation: function () {
            var _this = this;
            var scopes = this.getModel("userInfo").getProperty("/scopes");
            var manuals = [];
            for (var i = 0; i < scopes.length; i++) {
                var scope = scopes[i];
                if (scope.indexOf("Manual", scope.length - "Manual".length) !== -1)
                    manuals.push({
                        name: "ZWB_" + scope.substr(2).toUpperCase() + ".PDF"
                    });
            }

            switch (manuals.length) {
                case 0: // No documentation
                    MessageToast.show(this.getBundle().getText("manualNotPrepared"));
                    return;

                case 1: // Just one
                    _this.navToPost({
                        url: "/print/template?",
                        objid: manuals[0].name,
                        contentType: "application/pdf"
                    });
                    return;
            }

            // Many docs
            if (!_this._manualsDialog) {
                _this._manualsDialog = new SelectDialog({
                    contentWidth: "50%",

                    items: {
                        path: "/",
                        template: new sap.m.StandardListItem({
                            title: "{name}"
                        })
                    },

                    search: function (oEvent) {
                        var sValue = oEvent.getParameter("value");
                        var oBinding = oEvent.getSource().getBinding("items");
                        oBinding.filter(new Filter("name", FilterOperator.Contains, sValue));
                    },

                    confirm: function (oEvent) {
                        var aContexts = oEvent.getParameter("selectedContexts");
                        if (!aContexts || !aContexts.length)
                            return;

                        _this.navToPost({
                            url: "/print/template?",
                            objid: aContexts[0].getObject().name,
                            contentType: "application/pdf"
                        })
                    }
                });
                _this._manualsDialog.setModel(new JSONModel(manuals));

                _this._manualsDialog.addStyleClass(this.getContentDensityClass());
            }

            _this._manualsDialog.open();
        },

        eoValidation: function () {
            if (!this.eoDialog)
                this.eoDialog = this.createFragment("com.modekzWaybill.view.frag.EoDialog");

            this.eoDialog.open();
        },

        onEoUpdate: function () {
            this.eoUpdate(function () {
                this.findById('id_eo_table').getBinding("items").refresh();
            });
        },

        onEoCloseDialog: function () {
            this.eoDialog.close();
        },

        onEoAfterClose: function () {
            this.eoDialog.destroy();
            this.eoDialog = null;
        },

        eoSearch: function (oEvent) {
            var _this = this;

            var text = oEvent.getParameter("query");
            _this.filterEo(text, function (okFilter) {
                _this.findById('id_eo_table').getBinding("items").filter(okFilter);
            });
        },

        filterEo: function (text, callback) {
            var _this = this;

            var textFilter = null;
            if (text)
                textFilter = _this.getEoTextFilter(text);

            // Read user permissions
            _this.filterBy({
                filters: [
                    {
                        field: "Swerk",
                        scope: "werks"
                    },

                    textFilter
                ],

                ok: function (okFilter) {
                    callback.call(this, _this.makeAndFilter(okFilter, new Filter("TooName", FilterOperator.EQ, '-')));
                }
            });
        }

        // setNoDriverDate: function () {
        //     var items = this.findById('id_eo_table').getSelectedItems();
        //     if (items.length === 0) {
        //         MessageToast.show(this.getBundle().getText("selectRows"));
        //         return;
        //     }
        //
        //     var oWbModel = this.getModel("wb");
        //     var editObj = {
        //         NoDriverDate: new Date(1)
        //     };
        //
        //     // Update 1 by one
        //     for (var i = 0; i < items.length; i++) {
        //         var item = items[i].getBindingContext("wb").getObject();
        //         oWbModel.update("/Equipments('" + item.Equnr + "')", editObj);
        //     }
        //     oWbModel.refresh();
        // },
    });
});