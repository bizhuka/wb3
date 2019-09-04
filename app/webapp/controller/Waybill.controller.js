sap.ui.define([
    "com/modekzWaybill/controller/BaseController",
    "sap/ui/core/UIComponent",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/Sorter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/MessageType",
    "com/modekzWaybill/model/formatter"
], function (BaseController, UIComponent, ODataModel, Sorter, Filter, FilterOperator, JSONModel, MessageType, formatter) {
    "use strict";

    var wayBillTable, wbSearchField, wbStatusCombo;
    var prevFilt;

    return BaseController.extend("com.modekzWaybill.controller.Waybill", {
        onInit: function () {
            // call base init
            var _this = this;
            BaseController.prototype.onInit.apply(_this, arguments);

            wayBillTable = this.byId("id_waybill_table");
            wbSearchField = this.byId("id_wb_search_field");

            wbStatusCombo = this.byId("id_wb_status_combo");

            // What status to show
            var filtered = _this.status.getStatusLangArray(_this.status.WB_STATUS).filter(function (pair) {
                return pair.key !== _this.status.NOT_CREATED;
            });
            wbStatusCombo.setModel(new JSONModel(filtered));
        },

        onLineItemPressed: function (oEvent) {
            var oItem = oEvent.getSource().getBindingContext("wb").getObject();
            this.onWaybillPress(oItem.Id);
        },

        onUpdateStartedTable: function () {
            var oFilter = [];

            var textFilter = wbSearchField.getValue();
            var comboFilter = wbStatusCombo.getSelectedKey();
            var byToo = this.byId('id_by_too').getState();

            var fromDate = this.byId('id_date_from').getDateValue();
            var toDate = this.byId('id_date_to').getDateValue();
            var werksFilter = this.byId('id_werks_filter').getSelectedKey();

            // Called twice
            if (prevFilt &&
                prevFilt.text === textFilter &&
                prevFilt.combo === comboFilter &&
                prevFilt.byToo === byToo &&
                prevFilt.fromDate === fromDate &&
                prevFilt.toDate === toDate &&
                prevFilt.werksFilter === werksFilter)
                return;
            prevFilt = {
                text: textFilter,
                combo: comboFilter,
                byToo: byToo,
                fromDate: fromDate,
                toDate: toDate,
                werksFilter: werksFilter
            };

            if (textFilter && textFilter.length > 0) {
                var arr = [
                    // new Filter("Fio", FilterOperator.Contains, textFilter),
                    // new Filter("Driver", FilterOperator.Contains, textFilter),
                    new Filter("Description", FilterOperator.Contains, textFilter),
                    new Filter("Equnr", FilterOperator.Contains, textFilter),
                    new Filter("Eqktx", FilterOperator.Contains, textFilter),
                    new Filter("TooName", FilterOperator.Contains, textFilter),
                    new Filter("License_num", FilterOperator.Contains, textFilter)
                ];
                if (!isNaN(textFilter))
                    arr.push(new Filter("Id", FilterOperator.EQ, textFilter));

                oFilter.push(
                    new Filter({
                        filters: arr,
                        and: false
                    }));
            }

            if (comboFilter.length !== 0)
                oFilter.push(new Filter("Status", FilterOperator.EQ, comboFilter));

            // Show only TOO
            oFilter.push(new Filter("TooName", byToo ? FilterOperator.NE : FilterOperator.EQ, '-'));

            // Show only one werks data
            if (werksFilter)
                oFilter.push(new Filter("Werks", FilterOperator.EQ, werksFilter));

            // ToDate ?
            if (fromDate)
                oFilter.push(new Filter("GarageDepDate", FilterOperator.GE, fromDate));
            // FromDate ?
            if (toDate)
                oFilter.push(new Filter("GarageDepDate", FilterOperator.LE, toDate));

            var andFilter = oFilter.length > 0 ? new Filter({filters: oFilter, and: true}) : null;

            this.filterBy({
                filters: [
                    {
                        field: "Werks",
                        scope: "werks"
                    },

                    andFilter
                ],

                ok: function (okFilter) {
                    wayBillTable.getBinding("items").filter(okFilter);
                }
            });
        },

        handleSelection: function () {
            this.onUpdateStartedTable()
        },

        onSortPressed: function () {
            if (!this._oSortDialog)
                this._oSortDialog = this.createFragment("com.modekzWaybill.view.frag.WaybillSortDialog");
            this._oSortDialog.open();
        },

        onSortDialogConfirmed: function (oEvent) {
            var mParams = oEvent.getParameters();
            var oBinding = wayBillTable.getBinding("items");

            var sPath = mParams.sortItem.getKey();
            var bDescending = mParams.sortDescending;
            var sorters = new Sorter(sPath, bDescending);
            oBinding.sort(sorters);
        },

        onResetPressed: function () {
            wayBillTable.getBinding("items").sort(null);
            wbSearchField.setValue("");
            wbStatusCombo.setValue("");

            this.onUpdateStartedTable();
        },

        onExcelExport: function () {
            this.doExcelExport(wayBillTable, formatter.getUrl("/json/excel/v_waybill.json"));
        },

        onExcelExportGas: function () {
            this.doExcelExport(wayBillTable, formatter.getUrl("/json/excel/v_gasspent.json"), [
                {
                    from: "VWaybills?",
                    to: "VGasSpents?"
                }
            ]);
        },

        getWaybillInfo: function (status, reqCnt, schCnt, histCnt, gasCnt, delayReason, tooName) {
            var bundle = this.getBundle();
            var libStatus = this.status;

            var result = {
                status: parseInt(status),
                reqCnt: parseInt(reqCnt),
                schCnt: parseInt(schCnt),
                histCnt: parseInt(histCnt),
                gasCnt: parseInt(gasCnt),
                delayReason: parseInt(delayReason),
                tooName: tooName,
                errors: [],
                info: []
            };

            // No GSM
            if (result.status >= this.status.IN_PROCESS && result.gasCnt === 0)
                result.errors.push(bundle.getText("noGasPos", ["GasSpent"]));

            switch (result.status) {
                case this.status.REJECTED:
                    if (result.schCnt > 0)
                        result.errors.push(bundle.getText("hasSchedule", ["Schedule"]));

                    if (result.histCnt === 0)
                        result.errors.push(bundle.getText("noReqHistory", ["ReqHistory"]));
                    break;

                case this.status.CLOSED:
                    if (result.histCnt > 0)
                        result.errors.push(bundle.getText("hasReqHistory", ["ReqHistory"]));
                    break;
            }

            if (result.status !== this.status.REJECTED) {
                if (result.reqCnt === 0)
                    result.errors.push(bundle.getText("noReqs") + " (ReqHeader)");

                if (result.schCnt === 0)
                    result.errors.push(bundle.getText("noSchedule", ["Schedule"]));
            }

            if (result.delayReason !== libStatus.DR_NO_DELAY)
                result.info.push(bundle.getText("delayReason") + " " + this.getDelayReasonText(result.delayReason));
            if (result.tooName !== '-')
                result.info.push(bundle.getText("too") + " " + result.tooName);

            return result;
        },

        errorDesc: function (status, reqCnt, schCnt, histCnt, gasCnt, delayReason, tooName) {
            var wbInfo = this.getWaybillInfo(status, reqCnt, schCnt, histCnt, gasCnt, delayReason, tooName);

            // Join together
            var message = wbInfo.errors.concat(wbInfo.info);

            return message.length === 0 ? "" : message.join("\n");
        },

        rowHighlight: function (status, reqCnt, schCnt, histCnt, gasCnt, delayReason, tooName) {
            var libStatus = this.status;
            var wbInfo = this.getWaybillInfo(status, reqCnt, schCnt, histCnt, gasCnt, delayReason, tooName);

            if (wbInfo.errors.length > 0)
                return MessageType.Error;

            // Delay reason first
            var result = libStatus.findStatus(libStatus.DR_STATUS, wbInfo.delayReason);
            if (result && result.messageType)
                return result.messageType;

            // Status of WB itself
            result = libStatus.findStatus(libStatus.WB_STATUS, wbInfo.status);
            if (result && result.messageType)
                return result.messageType;

            if (wbInfo.info.length > 0)
                return MessageType.Information;

            return MessageType.None;
        }

    });
});