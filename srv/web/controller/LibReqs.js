sap.ui.define([
        "sap/ui/base/Object",
        "sap/ui/model/json/JSONModel",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "com/modekzWaybill/model/formatter",
        "com/modekzWaybill/controller/LibChangeStatus",
        "sap/ui/core/MessageType"
    ], function (BaseObject, JSONModel, Filter, FilterOperator, formatter, LibChangeStatus, MessageType) {
        "use strict";

        return BaseObject.extend("com.modekzWaybill.controller.LibReqs", {
            owner: null,
            uiData: null,

            reqTable: null,
            searchField: null,
            statusCombo: null,
            reqStatusCombo: null,
            werksStatusCombo: null,

            prevFilt: null,

            constructor: function (owner, uiData) {
                var _this = this;
                _this.owner = owner;
                _this.status = owner.status;

                // Default values
                if (uiData.showOptColumn === undefined)
                    uiData.showOptColumn = true;

                if (uiData.showWbColumn === undefined)
                    uiData.showWbColumn = false;

                if (uiData.showReason === undefined)
                    uiData.showReason = false;

                if (uiData.showActual === undefined)
                    uiData.showActual = false;

                // Filter by status and sort group
                uiData.showSortGroup = uiData.showStatus = !!uiData.statuses;
                uiData.showReqStatus = !!uiData.reqStatuses;

                if (uiData.selectMode === undefined)
                    uiData.selectMode = sap.m.ListMode.None;

                // Where to put the fragment
                if (uiData.container === undefined)
                    uiData.container = "id_reqs_container";

                if (uiData.containerMethod === undefined)
                    uiData.containerMethod = "addContent";
                _this.uiData = uiData;


                // Add fragment by code
                var fragment = owner.createFragment("com.modekzWaybill.view.frag.ReqsTable", _this);
                var container = owner.byId(uiData.container);
                if (!container)
                    container = owner.findById(uiData.container);
                container[uiData.containerMethod].call(container, fragment);

                // Define UI params
                this.uiModel = new JSONModel(uiData);
                container.setModel(this.uiModel, "ui");
            },

            onSortPress: function (oEvent) {
                var _this = this;
                this.onSortGroupPress(oEvent.getSource(), "id_sort_menu", "com.modekzWaybill.view.frag.ReqsMenuSort", function (oEvent) {
                    var sorter = [];
                    var field = oEvent.getParameter("item").getId().replace("id_sort_", "");
                    if (field)
                        sorter.push(new sap.ui.model.Sorter(field));

                    _this.reqTable.getBinding("items").sort(sorter);
                });
            },

            onGroupPress: function (oEvent) {
                var _this = this;
                this.onSortGroupPress(oEvent.getSource(), "id_group_menu", "com.modekzWaybill.view.frag.ReqsMenuGroup", function (oEvent) {
                    var sorter = [];
                    var field = oEvent.getParameter("item").getId().replace("id_group_", "");
                    if (field)
                        sorter.push(new sap.ui.model.Sorter(field, null, function (oContext) {
                            var v = oContext.getProperty(field);
                            return {key: v, text: v};
                        }));

                    _this.reqTable.getBinding("items").sort(sorter);
                });
            },

            onSortGroupPress(menuButton, id, pathFragment, callBack) {
                if (!this[id])
                    this[id] = this.owner.createFragment(pathFragment, {
                        onSortGroupClick: callBack
                    });

                var eDock = sap.ui.core.Popup.Dock;
                //this._bKeyboard
                this[id].open(false, menuButton, eDock.BeginTop, eDock.BeginBottom, menuButton);
            },

            onUpdateStartedReqs(oEvent) {
                this.reqTable = oEvent.getSource();
                this.doFilter();
            },

            onComboSelectionChange: function (oEvent) {
                this.statusCombo = oEvent.getSource();
                this.doFilter();
            },

            onReqComboSelectionChange: function (oEvent) {
                this.reqStatusCombo = oEvent.getSource();
                this.doFilter();
            },

            onWerksComboSelectionChange: function (oEvent) {
                this.werksStatusCombo = oEvent.getSource();
                this.doFilter();
                if (this.uiData.fireWerksComboChanged)
                    this.uiData.fireWerksComboChanged(this.werksStatusCombo);
            },

            handleFromDateChange: function (oEvent) {
                this.fromDate = oEvent.getSource();
                this.doFilter();
            },

            handleToDateChange: function (oEvent) {
                this.toDate = oEvent.getSource();
                this.doFilter();
            },

            onTextSearch: function (oEvent) {
                this.searchField = oEvent.getSource();
                this.doFilter();
            },

            doFilter: function (force) {
                // The table not ready yet
                if (!this.reqTable)
                    return;

                // No filter yet
                var filter = this.uiData.getFilter();
                this.reqTable.setBusy(!filter);
                if (!filter)
                    return;
                var arrFilter = [filter];

                // Text search and combo
                var textFilter = this.searchField ? this.searchField.getValue() : "";
                var comboFilter = this.statusCombo ? this.statusCombo.getSelectedKey() : "";
                var reqComboFilter = this.reqStatusCombo ? this.reqStatusCombo.getSelectedKey() : "";
                var werksComboFilter = this.werksStatusCombo ? this.werksStatusCombo.getSelectedKey() : "";
                var fromDate = this.fromDate ? this.owner.toSqlDate(this.fromDate.getDateValue().setHours(12, 0, 0, 0)) : "";
                var toDate = this.toDate ? this.owner.toSqlDate(this.toDate.getDateValue().setHours(12, 0, 0, 0)) : "";

                // Called twice
                if (this.prevFilt && this.prevFilt.text === textFilter &&
                    this.prevFilt.combo === comboFilter &&
                    this.prevFilt.reqCombo === reqComboFilter &&
                    this.prevFilt.werksCombo === werksComboFilter &&
                    this.prevFilt.fromDate === fromDate &&
                    this.prevFilt.toDate === toDate &&
                    force !== true)
                    return;
                this.prevFilt = {
                    text: textFilter,
                    combo: comboFilter,
                    reqCombo: reqComboFilter,
                    werksCombo: werksComboFilter,
                    fromDate: fromDate,
                    toDate: toDate
                };

                // Filter by status
                if (comboFilter.length !== 0) {
                    if (parseInt(comboFilter) === this.owner.status.NOT_CREATED)
                        arrFilter.push(new Filter("Waybill_Id", FilterOperator.EQ, this.status.WB_ID_NULL));
                    else
                        arrFilter.push(new Filter("Status", FilterOperator.EQ, comboFilter));
                }
                if (reqComboFilter.length !== 0)
                    arrFilter.push(new Filter("StatusReason", FilterOperator.EQ, reqComboFilter));

                // By werks
                if (werksComboFilter.length !== 0)
                    arrFilter.push(new Filter("Iwerk", FilterOperator.EQ, werksComboFilter));

                // Dates
                if (fromDate)
                    arrFilter.push(new Filter("Gltrp", FilterOperator.GE, fromDate));
                if (toDate)
                    arrFilter.push(new Filter("Gstrp", FilterOperator.LE, toDate));

                if (textFilter && textFilter.length > 0) {
                    var arr = [
                        new Filter("Objnr", FilterOperator.Contains, textFilter),
                        new Filter("Aufnr", FilterOperator.Contains, textFilter),
                        new Filter("Innam", FilterOperator.Contains, textFilter),
                        new Filter("Ilatx", FilterOperator.Contains, textFilter),
                        new Filter("Pltxt", FilterOperator.Contains, textFilter),
                        new Filter("Ltxa1", FilterOperator.Contains, textFilter),
                        new Filter("Stand", FilterOperator.Contains, textFilter),
                        new Filter("Priokx", FilterOperator.Contains, textFilter),
                        new Filter("Ktsch", FilterOperator.Contains, textFilter),
                        new Filter("KtschTxt", FilterOperator.Contains, textFilter),
                        new Filter("Fing", FilterOperator.Contains, textFilter)
                    ];

                    if (!isNaN(textFilter))
                        arr.push(new Filter("Waybill_Id", FilterOperator.EQ, textFilter));

                    arrFilter.push(
                        new Filter({
                            filters: arr,
                            and: false
                        }));
                }

                var andFilter = new Filter({filters: arrFilter, and: true});

                // And filter
                var reqsItems = this.reqTable.getBinding("items");
                this.owner.filterBy({
                    filters: [
                        {
                            field: "Iwerk",
                            scope: "werks"
                        },

                        {
                            field: "Beber",
                            scope: "beber"
                        },

                        {
                            field: "Ingpr",
                            scope: "ingrp"
                        },

                        andFilter
                    ],

                    ok: function (okFilter) {
                        reqsItems.filter(okFilter);
                    }
                });
            },

            onReqListSelectionChange(oEvent) {
                if (this.owner.onReqListSelectionChange)
                    this.owner.onReqListSelectionChange.call(this.owner, oEvent);
            },

            getPriority: function (priority) {
                switch (priority) {
                    case "1":
                        return "Error";
                    case "2":
                        return "Warning";
                    case "3":
                        return "Success";
                }
                return "None";
            },

            getPriorityIcon: function (priority) {
                switch (priority) {
                    case "1":
                        return "sap-icon://status-negative";
                    case "2":
                        return "sap-icon://status-in-process";
                    case "3":
                        return "sap-icon://status-positive";
                }
                return "sap-icon://status-inactive";
            },

            getOutObjnr: function (objnr) {
                if (objnr)
                    return this.owner.alphaOut(objnr.substr(2, 10)) + "~" + this.owner.alphaOut(objnr.substr(12, 8));
                return "###";
            },

            showDuration: function (duration) {
                var result = "";

                // Duration in hours
                if (parseInt(duration)) {
                    var hours = Math.floor(duration);
                    var minutes = Math.round((duration - hours) * 60);

                    if (hours < 10) hours = "0" + hours;
                    if (minutes < 10) minutes = "0" + minutes;

                    result += ' (' + hours + ':' + minutes + ')';
                }

                return result;
            },

            toShortTime: function (time) {
                return time ? time.toLocaleTimeString("ru-RU", {
                    hour: '2-digit',
                    minute: '2-digit'
                }) : "";
            },

            waybillOut: function (waybillId) {
                // Do not show with empty waybill
                if (parseInt(waybillId) === this.status.WB_ID_NULL ||
                    parseInt(waybillId) === this.status.WB_ID_REJECTED)
                    return "";
                return waybillId;
            },

            getStatusText: function (statusInd, waybillId) {
                return this.owner.getStatusText.call(this.owner, statusInd, waybillId);
            },

            getStatusReasonText: function (id) {
                var _owner = this.owner;
                if (parseInt(id) < 0)
                    return _owner.status.getStatusLangText(_owner.status.RR_STATUS, id);
                return _owner.status.getStatusLangText(_owner.status.RC_STATUS, id);
            },

            onWaybillPress: function (oEvent) {
                this.owner.onWaybillPress.call(this.owner, oEvent);
            },

            getHourDiff: function (fromDate, toDate) {
                if (!fromDate || !toDate)
                    return "";

                var sec_num = (formatter.checkDate(toDate).getTime() - formatter.checkDate(fromDate).getTime()) / 1000;

                var hours = Math.floor(sec_num / 3600);
                var minutes = Math.round((sec_num - (hours * 3600)) / 60);
                //var seconds = sec_num - (hours * 3600) - (minutes * 60);

                if (hours < 10) hours = "0" + hours;
                if (minutes < 10) minutes = "0" + minutes;
                //if (seconds < 10) seconds = "0" + seconds;
                return hours + ':' + minutes; //+ ':' + seconds;
            },

            onStatusReasonPress: function (oEvent) {
                var obj = oEvent.getSource().getBindingContext("wb").getObject();
                var changeStat = new LibChangeStatus(this.owner);
                var _this = this;
                var oWbModel = _this.owner.getModel("wb");

                // What would be edited
                var editFields = {
                    Objnr: obj.Objnr
                };
                var bundle = _this.owner.getBundle();
                changeStat.openDialog({
                    origin: _this.owner.status.RC_STATUS,
                    title: bundle.getText("closeReqs"),
                    ok_text: bundle.getText("confirm"),
                    text: obj.Reason ? obj.Reason : bundle.getText("done"),
                    reason: obj.StatusReason === this.owner.status.RC_SET ? this.owner.status.RC_DONE : obj.StatusReason,
                    fromDate: obj.FromDate ? obj.FromDate : new Date(formatter.checkDate(obj.Gstrp).getTime() + 8 * 3600 * 1000), // 8 hours
                    toDate: obj.ToDate ? obj.ToDate : new Date(formatter.checkDate(obj.Gltrp).getTime() + 20 * 3600 * 1000), // 20 hours
                    dateEdit: true,

                    check: function (block) {
                        editFields.Reason = block.text;
                        editFields.StatusReason = parseInt(block.reason);
                        editFields.FromDate = block.fromDate;
                        editFields.ToDate = block.toDate;

                        block.afterChecked(editFields.StatusReason !== _this.owner.status.RC_SET);
                    },

                    success: function () {
                        _this.owner.getOwnerComponent().modifyWrapper('UPDATE', "/ReqHeaders('" + obj.Objnr + "')", editFields, {
                            success: function () {
                                oWbModel.refresh();
                            },
                            error: function (err) {
                                _this.owner.showError(err, _this.owner.getBundle().getText("errUpdateReqs"));
                            }
                        })
                    }
                });
            },

            onRequestReject: function (oEvent) {
                var obj = oEvent.getSource().getBindingContext("wb").getObject();
                var changeStat = new LibChangeStatus(this.owner);
                var _this = this;
                var oWbModel = _this.owner.getModel("wb");

                // What would be edited
                var editFields = {
                    Objnr: obj.Objnr,
                    Waybill_Id: String(_this.owner.status.WB_ID_REJECTED)
                };
                var bundle = _this.owner.getBundle();
                changeStat.openDialog({
                    origin: _this.owner.status.RR_STATUS,
                    title: bundle.getText("rejectReqs"),
                    ok_text: bundle.getText("rejectReqs"),
                    text: obj.Reason ? obj.Reason : "---",
                    reason: obj.StatusReason,
                    dateEdit: false,

                    check: function (block) {
                        editFields.Reason = block.text;
                        editFields.StatusReason = parseInt(block.reason);

                        block.afterChecked(editFields.StatusReason < 0);
                    },

                    success: function () {
                        _this.getOwnerComponent().modifyWrapper('UPDATE', "/ReqHeaders('" + obj.Objnr + "')", editFields, {
                            success: function () {
                                oWbModel.refresh();
                            },
                            error: function (err) {
                                _this.owner.showError(err, _this.owner.getBundle().getText("errUpdateReqs"));
                            }
                        })
                    }
                });
            },

            setWaybillId: function (selectedItems, params) {
                // Update TORO header request
                var _this = this;
                var owner = _this.owner;
                var oWbModel = owner.getModel("wb");

                // If reqs updated
                var cnt = 0;
                var checkIsLast = function () {
                    if (--cnt === 0)
                        oWbModel.refresh();
                };
                if (selectedItems.length === 0)
                    oWbModel.refresh();

                for (var i = 0; i < selectedItems.length; i++) {
                    var item = selectedItems[i].getBindingContext("wb").getObject();

                    // Only if is equal to original
                    if (params.unset && parseInt(item.Waybill_Id) !== parseInt(params.waybillId))
                        continue;
                    cnt++;

                    // Modify to new WAYBILL
                    var waybillId = params.unset ? owner.status.WB_ID_NULL : params.waybillId;
                    var reqHeader = {
                        Objnr: item.Objnr,
                        Waybill_Id: formatter.isV4() ? Number(waybillId) : String(waybillId),
                        StatusReason: params.unset ? owner.status.RC_NEW : owner.status.RC_SET
                    };
                    owner.getOwnerComponent().modifyWrapper('UPDATE', "/ReqHeaders('" + item.Objnr + "')", reqHeader, {
                        success: function () {
                            checkIsLast();
                        },

                        error: function (err) {
                            owner.showError(err, owner.getBundle().getText("errUpdateReqs"));
                            checkIsLast();
                        }
                    })
                }

                // Select items again
                this.reqTable.removeSelections(true);
            },

            reqRowHighlight: function (statusReason) {
                statusReason = parseInt(statusReason);
                var status = this.owner.status;

                // Request is rejected
                var result = status.findStatus(
                    statusReason < 0 ? status.RR_STATUS : status.RC_STATUS, statusReason);

                // Ok show color of option
                if (result && result.messageType)
                    return result.messageType;

                return MessageType.None;
            },

            onExcelExport: function () {
                this.owner.doExcelExport(this.reqTable, ["Gltrp%20ge", "Gstrp%20le"], formatter.getUrl("/json/excel/v_reqheader.json"));
            }
        });
    }
);