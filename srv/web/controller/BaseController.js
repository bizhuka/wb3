/*global history */
sap.ui.define([
    'sap/ui/core/mvc/Controller',
    'sap/ui/core/routing/History',
    'sap/m/MessageToast',
    "sap/ui/model/Filter",
    'sap/ui/model/FilterOperator',
    'sap/m/Dialog',
    'sap/m/TextArea',
    'sap/m/Label',
    'sap/m/Button',
    'sap/ui/Device',
    'sap/ui/model/json/JSONModel',
    'com/modekzWaybill/model/formatter',
    'com/modekzWaybill/controller/LibStatus',
    'com/modekzWaybill/jsCode/statusCF'
], function (Controller, History, MessageToast, Filter, FilterOperator, Dialog, TextArea, Label, Button, Device, JSONModel, formatter, LibStatus, statusCF) {
    "use strict";

    var allowedBukrs = null;
    return Controller.extend("com.modekzWaybill.controller.BaseController", {
        status: null,

        onInit: function () {
            this.status = new LibStatus(this, statusCF.getCfTexts());
        },

        showError: function (err, message) {
            MessageToast.show(message, {
                duration: 3500
            });

            // Show as read message
            try {
                $('#content').parent().find('.sapMMessageToast').css('background', '#cc1919');
            } finally {
                // Show for debug?
                if (err)
                    console.log(err);
            }
        },

        // Create new with And
        makeAndFilter: function (mainFilter, addFilter) {
            if (addFilter)
                return new Filter({
                    filters: [mainFilter, addFilter],
                    and: true
                });
            return mainFilter;
        },

        filterBy: function (params) {
            var total = [];

            for (var i = 0; i < params.filters.length; i++) {
                // Just skip nulls
                var line = params.filters[i];
                if (!line)
                    continue;

                // Just add
                if (line instanceof Filter) {
                    total.push(line);
                    continue;
                }

                // Create by scope
                var items = this.getModel("userInfo").getProperty("/" + line.scope);
                if (items.length === 0)
                    continue;

                var filters = [];
                for (var j = 0; j < items.length; j++)
                    filters.push(new Filter(line.field, FilterOperator.EQ, items[j]));

                // Based on rights
                total.push(new Filter({filters: filters, and: false}));
            }

            // Return filter
            params.ok.call(this, new Filter({filters: total, and: true}));
        },

        filterItemsByUserBukrs: function (params) {
            var _this = this;

            // Cached bukrs
            if (allowedBukrs) {
                _this.doFiltByBukrs(params);
                return;
            }

            // Slow read
            _this.filterBy({
                filters: [
                    {
                        field: "Werks",
                        scope: "werks"
                    }
                ],

                ok: function (okFilter) {
                    _this.getOwnerComponent().readWrapper("Werks", [okFilter], function (err, results) {
                        if (err) {
                            _this.showError(null, err_message);
                            return;
                        }

                        allowedBukrs = results;
                        _this.doFiltByBukrs(params);
                    });
                }
            });
        },

        doFiltByBukrs: function (params) {
            var filters = [];
            for (var j = 0; j < allowedBukrs.length; j++)
                filters.push(new Filter(params.field, FilterOperator.EQ, allowedBukrs[j].Bukrs));
            var bukrsFilter = new Filter({filters: filters, and: false});

            // Return filter
            params.ok.call(this, this.makeAndFilter(bukrsFilter, params.and));
        },

        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        getModel: function (sName) {
            return this.getView().getModel(sName);
        },

        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        getBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        // Just use numeric index
        getStatusText: function (statusInd, waybillId) {
            if (waybillId === undefined)
                return "-Error-";

            // Do not show with empty waybill
            if (parseInt(waybillId) === this.status.WB_ID_NULL)
                return ""; // "Not created";

            // Show req status instead
            if (parseInt(waybillId) === this.status.WB_ID_REJECTED)
                return this.getBundle().getText("rejectReqs");

            return this.status.getStatusLangText(this.status.WB_STATUS, statusInd);
        },

        getDelayReasonText: function (id) {
            return this.status.getStatusLangText(this.status.DR_STATUS, id);
        },

        onNavBack: function () {
            var sPreviousHash = History.getInstance().getPreviousHash();

            if (typeof sPreviousHash !== "undefined") {
                // The history contains a previous entry
                history.go(-1);
            } else {
                // Otherwise we go backwards with a forward history
                var bReplace = true;
                this.getRouter().navTo("main", {}, bReplace);
            }
        },

        findById: function (id) {
            return sap.ui.getCore().byId(id);
        },

        toSapDate: function (date) {
            date = formatter.checkDate(date);
            return date ? date.getFullYear() +
                ('0' + (date.getMonth() + 1)).slice(-2) +
                ('0' + date.getDate()).slice(-2) : "";
        },

        toSapDateTime: function (date) {
            date = formatter.checkDate(date);
            return date ? this.toSapDate(date) + ('0' + date.getHours()).slice(-2) +
                ('0' + (date.getMinutes())).slice(-2) +
                ('0' + date.getSeconds()).slice(-2) : "";
        },

        toLocaleDate: function (date) {
            date = formatter.checkDate(date);
            return date ? date.toLocaleDateString("ru-RU", {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }) : "";
        },

        toLocaleDateTime: function (date) {
            date = formatter.checkDate(date);
            return date ? date.toLocaleDateString("ru-RU", {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
                //second: '2-digit'
            }) : "";
        },

        toSqlDateTime: function (date) {
            date = formatter.checkDate(date);
            return date.getUTCFullYear() +
                '-' + this.pad(date.getUTCMonth() + 1) +
                '-' + this.pad(date.getUTCDate()) +
                'T' + this.pad(date.getUTCHours()) +
                ':' + this.pad(date.getUTCMinutes()) +
                ':' + this.pad(date.getUTCSeconds());
            //'.' + (date.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) + 'Z';
        },

        toSqlDate: function (date) {
            date = formatter.checkDate(date);
            return this.toSqlDateTime(date).substr(0, 10);
        },

        pad: function (number) {
            if (number < 10) {
                return '0' + number;
            }
            return number;
        },

        alphaOut: function (inStr) {
            return inStr ? inStr.replace(/^0+/, '') : inStr; //"";
        },

        alphaIn: function (num, length) {
            var pad = new Array(1 + length).join('0');
            return (pad + num).slice(-pad.length);
        },

        formatTime: function (time) {
            if (!time || (typeof time !== "string") || time.length !== 6)
                return;
            return time.substring(0, 2) + ":" + time.substring(2, 4) + ":" + time.substring(4, 6);
        },

        createFragment: function (fragment, controller) {
            var result = sap.ui.xmlfragment(fragment, controller ? controller : this);

            // For dialogs
            if (result.addStyleClass) {
                result.addStyleClass(this.getContentDensityClass());
                this.getView().addDependent(result);
            }

            return result;
        },

        // This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy design mode class should be set, which influences the size appearance of some controls.
        getContentDensityClass: function () {
            if (this._sContentDensityClass === undefined) {
                // check whether FLP has already set the content density class; do nothing in this case
                if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
                    this._sContentDensityClass = "";
                } else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
                    this._sContentDensityClass = "sapUiSizeCompact";
                } else {
                    // "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
                    this._sContentDensityClass = "sapUiSizeCozy";
                }
            }
            return this._sContentDensityClass;
        },

        onWaybillPress: function (oEvt) {
            if (!this.getModel("userInfo").getProperty("/WbShowOne")) {
                MessageToast.show(this.getBundle().getText("noOneWbRights"));
                return;
            }
            var id = isNaN(oEvt) ? oEvt.getSource().getBindingContext("wb").getObject().Waybill_Id : oEvt;
            this.getRouter().navTo("waybillDetail", {waybillId: id});
        },

        updateDbFrom: function (params) {
            var _this = this;
            $.ajax({
                dataType: "json",
                url: params.link,
                timeout: params.timeout ? params.timeout : 15000, // 15 seconds by default
                success: function (result) {
                    _this.showUpdateInfo(result, params);
                },
                error: function () {
                    _this.showError(null, _this.getBundle().getText("errDict", [params.title]));

                    if (params.afterUpdate)
                        params.afterUpdate.call(_this, false);
                }
            });
        },

        showUpdateInfo(json, params) {
            var bundle = this.getBundle();
            MessageToast.show(
                bundle.getText("okDict", [params.title, json.updated, json.inserted]) +
                (json.dbcnt ? bundle.getText("okDictR3", [json.dbcnt]) : "") +
                (json.deleted ? bundle.getText("okDictDel", [json.deleted]) : ""));

            if (params.afterUpdate)
                params.afterUpdate.call(this, true);
        },

        addDays: function (date, cnt) {
            return new Date(formatter.checkDate(date).getTime() + cnt * 3600 * 24 * 1000)
        },

        diffInDays: function (dTo, dFrom) {
            return parseInt((dTo.getTime() - dFrom.getTime()) / (3600 * 24 * 1000));
        },

        checkSchedule: function (oWaybill, callBack) {
            var _this = this;

            // dates only
            var toDate = parseInt(_this.toSapDate(oWaybill.ToDate));
            var fromDate = parseInt(_this.toSapDate(oWaybill.FromDate));

            _this.getOwnerComponent().readWrapper("Schedules", [
                    new Filter("Werks", FilterOperator.EQ, oWaybill.Werks),
                    new Filter("Datum", FilterOperator.BT,
                        _this.addDays(oWaybill.FromDate, -1),
                        _this.addDays(oWaybill.ToDate, 1)),
                    new Filter("Equnr", FilterOperator.EQ, oWaybill.Equnr)
                ],
                function (error, items) {
                    if (error) {
                        callBack.call(_this, _this.getBundle().getText("errReadDict"));
                        return;
                    }

                    for (var i = 0; i < items.length; i++) {
                        var item = items[i];
                        var itemDate = parseInt(_this.toSapDate(item.Datum));

                        // added one day previously
                        if (itemDate > toDate || itemDate < fromDate)
                            continue;

                        item.Waybill_Id = parseInt(item.Waybill_Id);

                        // Planned work
                        if (item.Waybill_Id === _this.status.WB_ID_NULL && item.Ilart) {
                            callBack.call(_this, _this.getBundle().getText("occupiedByRepair",
                                [_this.toLocaleDate(item.Datum), _this.alphaOut(item.Equnr), item.Ilart]));
                            return;
                        }

                        if (item.Waybill_Id !== parseInt(oWaybill.Id)) {
                            callBack.call(_this, _this.getBundle().getText("occupiedByWb",
                                [_this.toLocaleDate(item.Datum), _this.alphaOut(item.Equnr), item.Waybill_Id]));
                            return;
                        }
                    }

                    callBack.call(_this, null);
                });
        },

        eoUpdate: function (callBack) {
            var _this = this;
            _this.updateDbFrom({
                link: "/r3/EQUIPMENT?_persist=true",

                title: _this.getBundle().getText("eoList"),

                afterUpdate: function () {
                    callBack.call(_this);
                }
            });
        },

        // Use get :)
        navToPost: function (navParams, justReturn) {
            var url = navParams.url;
            delete navParams.url;

            for (var key in navParams)
                if (navParams.hasOwnProperty(key))
                    url += ("&" + key + "=" + encodeURIComponent(navParams[key]));

            if (justReturn)
                return url;
            // else navigate
            window.location = url;
        },

        getEoTextFilter: function (text) {
            return new Filter({
                filters: [
                    new Filter("Equnr", FilterOperator.Contains, text),
                    new Filter("Eqktx", FilterOperator.Contains, text),
                    new Filter("TooName", FilterOperator.Contains, text),
                    new Filter("License_num", FilterOperator.Contains, text),
                    new Filter("N_class", FilterOperator.Contains, text),
                    new Filter("Eqart", FilterOperator.Contains, text),
                    new Filter("Typbz", FilterOperator.Contains, text),
                    new Filter("Imei", FilterOperator.Contains, text),
                    new Filter("Pltxt", FilterOperator.Contains, text)
                ],
                and: false
            })
        },

        absolutePath: function (href) {
            if (!this.link)
                this.link = document.createElement("a");

            this.link.href = href;
            return this.link.href;
        },

        doExcelExport: function (table, columnFile, replaceBlock) {
            var oRowBinding = table.getBinding("items");
            var oModel = oRowBinding.getModel();
            var oModelInterface = oModel.getInterface();

            var jsonModel = new JSONModel(columnFile);
            jsonModel.attachRequestCompleted(function () {
                var columns = jsonModel.getProperty("/columns");
                var locale = navigator.language === 'ru' ? 'ru' : 'kz';

                for (var i = 0; i < columns.length; i++) {
                    var column = columns[i];
                    columns[i].label = locale === 'ru' ? column.label_ru : column.label_kz;
                    columns[i].property = column.property.replace('{locale}', locale);
                }

                // Load async
                sap.ui.require(["sap/ui/export/Spreadsheet"], function (Spreadsheet) {
                    var oSettings = {
                        workbook: {
                            columns: columns
                        },
                        dataSource: {
                            type: "odata",
                            dataUrl: oRowBinding.getDownloadUrl ? oRowBinding.getDownloadUrl() : null,
                            serviceUrl: oModelInterface.sServiceUrl,
                            headers: oModelInterface.getHeaders ? oModelInterface.getHeaders() : null,
                            count: oRowBinding.getLength ? oRowBinding.getLength() : null,
                            useBatch: oModelInterface.bUseBatch,
                            sizeLimit: oModelInterface.iSizeLimit
                        }
                    };
                    if (oSettings.dataSource.dataUrl && replaceBlock)
                        for (var i = 0; i < replaceBlock.length; i++) {
                            var block = replaceBlock[i];
                            oSettings.dataSource.dataUrl = oSettings.dataSource.dataUrl.replace(block.from, block.to);
                        }

                    var oSheet = new Spreadsheet(oSettings);
                    oSheet.build().finally(function () {
                        oSheet.destroy();
                    });
                });
            });
        }
    });
});