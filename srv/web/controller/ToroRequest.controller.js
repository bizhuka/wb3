sap.ui.define([
    'com/modekzWaybill/controller/BaseController',
    'sap/m/MessageToast',
    'sap/m/Label',
    'sap/m/ButtonType',
    'sap/m/SelectDialog',
    'sap/ui/core/MessageType',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/ui/model/json/JSONModel',
    'sap/ui/core/UIComponent',
    'com/modekzWaybill/model/formatter',
    'com/modekzWaybill/controller/LibReqs',
    'com/modekzWaybill/controller/LibChangeStatus'
], function (BaseController, MessageToast, Label, ButtonType, SelectDialog, MessageType, Filter, FilterOperator, JSONModel, UIComponent, formatter, LibReqs, LibChangeStatus) {
    "use strict";

    var C_FIX_COLUMN = 2;
    var C_EMPTY_TEXT = '---';

    var eoFilterInfo = {
        classFilter: null,
        classFilterPrev: null,

        textFilter: null,

        werksComboFilter: null, // ComboBox value

        // All previous
        wholeFilterPrev: null
    };

    var fromDate;
    var toDate;

    // ComboBox control
    var _WerksStatusCombo;

    return BaseController.extend("com.modekzWaybill.controller.ToroRequest", {

        onInit: function () {
            // call base init
            var _this = this;
            BaseController.prototype.onInit.apply(_this, arguments);

            this.detailHeader = this.byId("id_detail_header");
            this.tbSchedule = this.byId("id_eo_schedule");
            this.dpFrom = this.byId("dpFrom");
            this.dpTo = this.byId("dpTo");

            // Date from to
            var datFrom = new Date();
            var datTo = this.addDays(datFrom, 3);

            this.dpFrom.setDateValue(datFrom);
            this.dpTo.setDateValue(datTo);

            this.onDatePickChange(null);

            // What status to show
            var filtered = _this.status.getStatusLangArray(_this.status.WB_STATUS).filter(function (pair) {
                return pair.key === _this.status.NOT_CREATED || pair.key === _this.status.REJECTED;
            });

            this.libReqs = new LibReqs(this, {
                showWbColumn: false,
                selectMode: sap.m.ListMode.MultiSelect,
                statuses: filtered,
                canReject: true,
                getFilter: function () {
                    return new Filter({
                        filters: [
                            new Filter("Waybill_Id", FilterOperator.EQ, _this.status.WB_ID_NULL), // .EQ NOT_CREATED
                            new Filter("Status", FilterOperator.EQ, _this.status.REJECTED)
                        ],
                        and: false
                    })
                },

                // Filter changed ?
                fireWerksComboChanged: function (werksStatusCombo) {
                    _WerksStatusCombo = werksStatusCombo;
                    _this.onUpdateStartedSchedule();
                }
            });

            var oRouter = UIComponent.getRouterFor(this);
            oRouter.getRoute("toroRequest").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function () {
            var listItems = this.tbSchedule.getBinding("items");
            if (!listItems)
                return;

            var _this = this;
            listItems.attachDataReceived(function () {
                _this.readSchedule();
            });
            _this.readSchedule();
        },

        onReqStateChange: function (oEvent) {
            // Show additional columns if have enough space
            var reqLayout = oEvent ? oEvent.getParameter("layout") : this.getModel("appView").getProperty("/reqLayout");
            this.libReqs.uiModel.setProperty("/showOptColumn", reqLayout === "TwoColumnsBeginExpanded" || reqLayout === "OneColumn");
        },

        setReqLayout: function (newLayout) {
            var appViewModel = this.getModel("appView");
            var curLayout = appViewModel.getProperty("/reqLayout");

            if (curLayout.indexOf('Expanded') > 0)
                this.prevReqLayout = curLayout;

            if (newLayout === undefined)
                newLayout = this.prevReqLayout;

            if (!newLayout)
                newLayout = "TwoColumnsMidExpanded";

            appViewModel.setProperty("/reqLayout", newLayout);
            this.onReqStateChange();
        },

        navOneColumn: function () {
            this.setReqLayout("OneColumn");
        },

        navMidColumnFullScreen: function () {
            this.setReqLayout("MidColumnFullScreen");
        },

        navBackLayout: function () {
            this.setReqLayout();
        },

        readSchedule: function () {
            var _this = this;
            var eoItems = _this.tbSchedule.getBinding("items").getContexts();
            if (!eoItems.length)
                return;

            var oWbModel = _this.getModel("wb");

            var items = {};
            var werksArr = [], werksKeys = [];
            var equnrArr = [];

            for (var i = 0; i < eoItems.length; i++) {
                var context = eoItems[i];
                var item = context.getObject();//TODO was oWbModel.getProperty(context.sPath);

                // Save for changing
                items[item.Equnr] = {
                    path: context.sPath,
                    row: item,
                    changed: false
                };

                if (werksKeys.indexOf(item.Swerk) < 0) {
                    werksKeys.push(item.Swerk);
                    werksArr.push(new Filter("Werks", FilterOperator.EQ, item.Swerk));
                }
                equnrArr.push(new Filter("Equnr", FilterOperator.EQ, item.Equnr));
            }

            var filters = [
                new Filter("Datum", FilterOperator.BT,
                    _this.addDays(this.dpFrom.getDateValue(), -1),
                    _this.addDays(this.dpTo.getDateValue(), 1)),
                new Filter({
                    filters: werksArr,
                    and: false
                })
            ];

            // TODO check
            if (!formatter.isWindows() || !formatter.isNodeJs())
                filters.push(
                    new Filter({
                        filters: equnrArr,
                        and: false
                    }));

            _this.getOwnerComponent().readWrapper("Schedules",
                filters,
                function (error, schedules) {
                    if (error || !_this.tbSchedule)
                        return;

                    var items = _this.tbSchedule.getItems();
                    var columnCount = _this.tbSchedule.getColumns().length;

                    // Without time!
                    var dFrom = _this.dpFrom.getDateValue();
                    dFrom.setHours(0, 0, 0, 0);

                    var wbShowOne = _this.getModel("userInfo").getProperty("/WbShowOne") === true;
                    var wbMechanic = _this.getModel("userInfo").getProperty("/WbMechanic") === true;

                    for (var i = 0; i < items.length; i++) {
                        var cells = items[i].getCells();

                        // Clear cells
                        for (var c = C_FIX_COLUMN; c < columnCount; c++) {
                            var link = cells[c];
                            link.setText(C_EMPTY_TEXT);
                            link.setEnabled(_this.checkWithDate(new Date(link.getTarget()), wbMechanic));
                        }

                        var equnr = items[i].getBindingContext("wb").getObject().Equnr;

                        for (var s = 0; s < schedules.length; s++) {
                            var schedule = schedules[s];
                            if (schedule.Equnr === equnr && _this.toSapDate(dFrom) <= _this.toSapDate(schedule.Datum)) {
                                var daysOff = _this.diffInDays(schedule.Datum, dFrom) + C_FIX_COLUMN;

                                link = cells[daysOff];
                                if (link && daysOff > (C_FIX_COLUMN - 1)) {
                                    link.setText(schedule.Ilart ? schedule.Ilart : schedule.Waybill_Id);

                                    var isEnabled = (parseInt(schedule.Waybill_Id) > 0 && wbShowOne) ||
                                        link.getEnabled(); // (_this.checkWithDate(new Date(link.getTarget()), wbMechanic) // schedule.Datum

                                    link.setEnabled(isEnabled);
                                }
                            }
                        }
                    }
                });
        },

        onUpdateStartedSchedule: function () {
            var _this = this;
            var textFilter = _this.byId('id_eo_search').getValue();
            var werksComboFilter = _WerksStatusCombo ? _WerksStatusCombo.getSelectedKey() : "";

            if (eoFilterInfo.classFilterPrev === eoFilterInfo.classFilter &&
                eoFilterInfo.textFilter === textFilter &&
                eoFilterInfo.werksComboFilter === werksComboFilter)
                return;

            // Save info
            eoFilterInfo.classFilterPrev = eoFilterInfo.classFilter;
            eoFilterInfo.textFilter = textFilter;
            eoFilterInfo.werksComboFilter = werksComboFilter;

            this.filterBy({
                filters: [
                    {
                        field: "Swerk",
                        scope: "werks"
                    },

                    eoFilterInfo.classFilter
                ],

                ok: function (okFilter) {
                    var filter = textFilter ?
                        _this.makeAndFilter(okFilter, _this.getEoTextFilter(textFilter)) :
                        okFilter;

                    // Do not show marked EO
                    filter = _this.makeAndFilter(filter, new Filter("Expelled", FilterOperator.NE, "X"));

                    // From ComboBox
                    if (werksComboFilter)
                        filter = _this.makeAndFilter(filter, new Filter("Swerk", FilterOperator.EQ, werksComboFilter));

                    eoFilterInfo.wholeFilterPrev = filter;
                    this.tbSchedule.getBinding("items").filter(eoFilterInfo.wholeFilterPrev);
                }
            });
        },

        onReqUpdate: function () {
            var _this = this;
            var now = new Date();
            _this.updateDbFrom({
                link: "/r3/REQ_HEADER?_persist=true" +
                    "&TO_DATE=" + _this.toSqlDate(_this.addDays(now, +29)) +
                    "&FROM_DATE=" + _this.toSqlDate(_this.addDays(now, -29)),
                title: _this.getBundle().getText("reqs"),

                afterUpdate: function () {
                    _this.libReqs.reqTable.getBinding("items").refresh();
                }
            });
        },

        onEoUpdate: function () {
            this.eoUpdate(function () {
                this.tbSchedule.getBinding("items").refresh();
            });
        },

        onNavToFinished: function () {
            this.getRouter().navTo("finishedReqs");
        },

        onDatePickChange: function (oEvent) {
            // Current controller
            var _this = this;

            var dFrom = this.dpFrom.getDateValue();
            var dTo = this.dpTo.getDateValue();

            if (oEvent) {
                var diff = this.diffInDays(dTo, dFrom);
                if (diff > 10 || diff < 0)
                    switch (oEvent.getSource()) {
                        case this.dpTo:
                            this.dpFrom.setDateValue(this.addDays(dTo, -7));
                            break;

                        case this.dpFrom:
                            this.dpTo.setDateValue(this.addDays(dFrom, 7));
                            break;
                    }
            }

            // Use copy
            dFrom = new Date(this.dpFrom.getDateValue());
            dTo = new Date(this.dpTo.getDateValue());

            // Binding cells
            var info = this.tbSchedule.getBindingInfo("items");
            var arrCells = info.template.getCells();
            arrCells.splice(C_FIX_COLUMN);

            // Columns
            for (var i = this.tbSchedule.getColumns().length; i >= C_FIX_COLUMN; i--)
                this.tbSchedule.removeColumn(i);

            // Create new cells & columns this.tbSchedule.destroyColumns();
            var todayText = this.toLocaleDate(new Date());
            while (dFrom < dTo) {
                // Column
                var text = this.toLocaleDate(dFrom);
                this.tbSchedule.addColumn(new sap.m.Column({
                    header: new Label({
                        text: text,
                        required: todayText === text
                    })
                }));

                // Save in target field
                var columnDate = new Date(dFrom.getTime());
                columnDate.setHours(12, 0, 0, 0);

                // Create link
                var link = new sap.m.Link({
                    text: C_EMPTY_TEXT,

                    target: _this.toSqlDateTime(columnDate),

                    enabled: _this.checkWithDate(columnDate, "{= ${userInfo>/WbMechanic}===true}"),

                    press: function (oEvent) {
                        var src = oEvent.getSource();

                        // Is waybill
                        var waybillId = parseInt(src.getText());
                        if (waybillId) {
                            _this.onWaybillPress(waybillId);
                            return;
                        }

                        // For mechanic
                        var item = src.getBindingContext("wb").getObject();

                        // Previous item
                        var oSchedule = {
                            Datum: new Date(src.getTarget()),
                            Werks: item.Swerk,
                            Equnr: item.Equnr,
                            Ilart: src.getText()
                        };

                        _this.onShowRepairDialog([oSchedule], oSchedule.Ilart === C_EMPTY_TEXT);
                    }
                });

                // Add cell
                arrCells.push(link);

                dFrom.setDate(dFrom.getDate() + 1);
            }

            // template: this.byId ?
            var oTemplate = new sap.m.ColumnListItem({
                cells: arrCells,
                highlight: {
                    parts: [{path: 'wb>TooName'}, {path: 'wb>NoDriverDate'}],

                    formatter: function (tooName, noDriverDate) {
                        if (_this.isNoDriver(noDriverDate))
                            return MessageType.Warning;

                        return tooName !== '-' ? MessageType.Information : MessageType.None;
                    }
                }
            });

            this.tbSchedule.bindItems({
                path: "wb>" + info.path,
                template: oTemplate,
                filters: eoFilterInfo.wholeFilterPrev
            });

            // Check rights
            var userModel = new JSONModel("/./userInfo");
            userModel.attachRequestCompleted(function () {
                var loadSchedule = userModel.getProperty("/WbLoaderSchedule") === true;
                if (!loadSchedule)
                    _this._onObjectMatched();
                else
                    _this.updateDbFrom({
                        link: "/r3/SCHEDULE?_persist=true" +
                            "&TO_DATE=" + _this.toSqlDate(_this.dpTo.getDateValue()) +
                            "&FROM_DATE=" + _this.toSqlDate(_this.dpFrom.getDateValue()),

                        title: _this.getBundle().getText("journal"),

                        timeout: 2500, // 2,5 seconds

                        afterUpdate: function () {
                            _this._onObjectMatched();
                        }
                    });
            });
        },

        eoTooltip: function (equnr, nClass, tooName, noDriverDate) {
            var result = [];
            result.push(this.getBundle().getText(tooName === '-' ? 'eo' : 'idToo') + ":");
            result.push(this.alphaOut(equnr));
            if (tooName !== '-')
                result.push(tooName);
            result.push(this.getBundle().getText("class") + ":");
            result.push(nClass);

            if (this.isNoDriver(noDriverDate))
                result.push(this.getBundle().getText("noDriverToDate", [this.toLocaleDate(noDriverDate)]));

            return result.join("\n");
        },

        isNoDriver: function (noDriverDate) {
            return noDriverDate && this.toSapDate(noDriverDate) === this.toSapDate(new Date());
        },

        onReqListSelectionChange: function (oEvt) {
            // get selection
            var arrItems = this.libReqs.reqTable.getSelectedItems();

            this.detailHeader.destroyAttributes();
            var cnt = arrItems ? arrItems.length : 0;
            this.detailHeader.setNumber(cnt + " " + this.getBundle().getText("request"));

            eoFilterInfo.classFilter = null;
            if (cnt !== 0) {
                var arrClass = {};
                fromDate = new Date(8640000000000000);
                toDate = new Date(0);

                for (var i = 0; i < arrItems.length; i++) {
                    var item = arrItems[i].getBindingContext("wb").getObject();
                    item.Gstrp = formatter.checkDate(item.Gstrp);
                    item.Gltrp = formatter.checkDate(item.Gltrp);
                    arrClass[item.Ktsch] = item.Ktsch;

                    this.detailHeader.addAttribute(new sap.m.ObjectAttribute({
                        title: item.Aufnr,
                        text: item.Innam + " - " + item.Ltxa1 + " - " + item.Pltxt
                    }));

                    if (item.Gstrp.getTime() < fromDate.getTime())
                        fromDate = item.Gstrp;
                    if (item.Gltrp.getTime() > toDate.getTime())
                        toDate = item.Gltrp;
                }

                // Set range of waybill
                if (toDate === 0) {
                    this.detailHeader.setNumberUnit("");
                    fromDate = toDate = null;
                } else
                    this.detailHeader.setNumberUnit(
                        this.getBundle().getText("reqsPeriod",
                            [this.toLocaleDate(fromDate),
                                this.toLocaleDate(toDate),
                                this.diffInDays(toDate, fromDate) + 1]));

                var oFilters = [];
                for (var key in arrClass)
                    if (arrClass.hasOwnProperty(key)) {
                        // "0" & Ktsch === N_class
                        // key = "0" + key;
                        oFilters.push(new Filter("N_class", FilterOperator.EQ, key));
                    }


                // Called twice
                eoFilterInfo.classFilter = new Filter({
                    filters: oFilters,
                    and: false
                });
                this.checkEoFilter();
            }

            this.onUpdateStartedSchedule();

            // If have no reqs
            this.onEquipSelected();
        },

        onEquipSelected: function () {
            // Hide or show schedule buttons
            this.setScheduleButtons({});

            var createButton = this.byId('id_wb_create_button');
            var eoItem = this.tbSchedule.getSelectedItem();
            var selectedItems = this.libReqs.reqTable.getSelectedItems();
            var userInfo = this.getModel("userInfo");

            if (!eoItem || !userInfo.getProperty("/WbCreateNew")) {
                createButton.setVisible(false);
                return;
            }
            createButton.setVisible(true);

            // Change appearance
            eoItem = eoItem.getBindingContext("wb").getObject();
            var withNoReqs = (selectedItems.length === 0) && userInfo.getProperty("/WbCreateNoReq");
            var addText = withNoReqs ? " - " + this.getBundle().getText("noReqs2") : "";
            if (eoItem.TooName !== '-') {
                createButton.setIcon(sap.ui.core.IconPool.getIconURI("sap-icon://request"));
                createButton.setText(this.getBundle().getText("createWithToo") + addText);
            } else {
                createButton.setIcon(sap.ui.core.IconPool.getIconURI("sap-icon://create-form"));
                createButton.setText(this.getBundle().getText("createWb") + addText);
            }
            createButton.setType(withNoReqs ? ButtonType.Reject : ButtonType.Default);
        },

        setScheduleButtons: function (params) {
            var addButton = this.byId('id_add_schedule');
            var delButton = this.byId('id_del_schedule');

            // Hide by default
            addButton.setVisible(false);
            delButton.setVisible(false);

            // Done
            if (params.JUST_HIDE)
                return;

            var items = this.tbSchedule.getSelectedItems();
            var userInfo = this.getModel("userInfo");

            // No need
            if (!items || items.length === 0 || !userInfo.getProperty("/WbMechanic"))
                return;

            // // Find today
            var columns = this.tbSchedule.getColumns();
            var index = false;

            // Find today column index
            for (var i = C_FIX_COLUMN; i < columns.length; i++) {
                if (columns[i].getHeader().getRequired()) {
                    index = i;
                    break;
                }
            }

            // Today not visible
            if (!index)
                return;

            var showAdd = false;
            var showDel = false;
            for (i = 0; i < items.length; i++) {
                var link = items[i].getCells()[index];
                var text = link.getText();

                if (text === C_EMPTY_TEXT)
                    showAdd = true;
                else
                    showDel = true;
            }

            // Show or hide
            addButton.setVisible(showAdd && !showDel);
            delButton.setVisible(showDel && !showAdd);
        },

        checkEoFilter: function () {
            if (!eoFilterInfo.classFilter || eoFilterInfo.classFilter.aFilters.length <= 1)
                return true;

            var message = "";
            for (var i = 0; i < eoFilterInfo.classFilter.aFilters.length; i++) {
                var key = eoFilterInfo.classFilter.aFilters[i].oValue1;

                if (message)
                    message += ("\n" + key);
                else
                    message = key;
            }

            MessageToast.show(this.getBundle().getText("errDiffClass", [message]));
            return false;
        },

        checkReqs: function (selectedItems, oWaybill, callBack) {
            var _this = this;

            if (selectedItems.length === 0 && oWaybill.WithNoReqs) {
                // Second check
                _this.checkSchedule(oWaybill, callBack);
                return;
            }

            var reqFilter = [];
            for (var i = 0; i < selectedItems.length; i++) {
                var item = selectedItems[i].getBindingContext("wb").getObject();
                reqFilter.push(new Filter("Objnr", FilterOperator.EQ, item.Objnr));
            }

            _this.getOwnerComponent().readWrapper("VReqHeaders", [new Filter({
                    filters: reqFilter,
                    and: false
                })],
                function (error, items) {
                    if (error) {
                        callBack.call(_this, _this.getBundle().getText("errReadReqs"));
                        return;
                    }

                    for (var i = 0; i < items.length; i++) {
                        var item = items[i];
                        if (parseInt(item.Waybill_Id) === _this.status.WB_ID_NULL || item.Status === _this.status.REJECTED)
                            continue;

                        callBack.call(_this, _this.getBundle().getText("errReqsProcessed", [item.Objnr]));
                        return;
                    }

                    // Second check
                    _this.checkSchedule(oWaybill, callBack);
                });
        },

        onCreateWaybill: function () {
            // get selection
            var _this = this;
            var selectedItems = this.libReqs.reqTable.getSelectedItems();
            var eoItem = this.tbSchedule.getSelectedItem();

            // Different classes
            if (!this.checkEoFilter())
                return;

            var haveRights = this.getModel("userInfo").getProperty("/WbCreateNoReq");
            if (selectedItems.length === 0 || !eoItem) {
                if (haveRights)
                    MessageToast.show(this.getBundle().getText("selectItems"));
                else
                    _this.showError(null, this.getBundle().getText("selectItems"));

                // If no car or do not have permission
                if (!eoItem || !haveRights)
                    return;
            }

            // Prepare objects
            eoItem = eoItem.getBindingContext("wb").getObject();

            // New waybill
            var oWaybill = {
                Equnr: eoItem.Equnr,
                Werks: eoItem.Swerk,
                Bukrs: eoItem.Bukrs,
                Description: "",
                CreateDate: new Date(1),
                FromDate: fromDate,
                ToDate: toDate,
                Status: _this.status.CREATED,
                WithNoReqs: selectedItems.length === 0
            };

            var createWbDialog = new LibChangeStatus(_this);
            createWbDialog.openDialog({
                origin: _this.status.DR_STATUS,
                title: _this.byId('id_wb_create_button').getText(),
                ok_text: _this.getBundle().getText("create"),
                text: '',
                fromDate: oWaybill.FromDate,
                toDate: oWaybill.ToDate,
                dateEdit: true,

                check: function (block) {
                    if (!oWaybill.WithNoReqs && toDate.getTime() - fromDate.getTime() > block.toDate.getTime() - block.fromDate.getTime()) {
                        MessageToast.show(_this.getBundle().getText("errNoEnoughDays"));
                        block.afterChecked(false);
                        return;
                    }

                    // Set from dialog
                    oWaybill.Description = block.text;
                    oWaybill.FromDate = block.fromDate;
                    oWaybill.ToDate = block.toDate;
                    oWaybill.DelayReason = parseInt(block.reason);

                    // Check in DB
                    _this.checkReqs(selectedItems, oWaybill, function (err_message) {
                        if (err_message) {
                            _this.showError(null, err_message);
                            block.afterChecked(false);
                            return;
                        }
                        block.afterChecked(true);
                    });
                },

                success: function () {
                    _this.getOwnerComponent().modifyWrapper("CREATE", '/Waybills', oWaybill, {
                        success: function (ret) {
                            MessageToast.show(_this.getBundle().getText("okCreateItem", [ret.Id, '', '', '']));

                            _this.libReqs.setWaybillId(selectedItems, {
                                waybillId: ret.Id
                            });

                            _this.tbSchedule.removeSelections(true);
                        },

                        error: function (err) {
                            _this.showError(err, _this.getBundle().getText("errCreateWb"));
                        }
                    }); // oData create new waybill
                } // success text dialog
            }); // Text dialog callback
        },

        checkWithDate: function (date, enabled) {
            // Without time!
            var today = new Date();
            today.setHours(0, 0, 0, 0);

            // Is mechanic ?
            return date.getTime() >= today.getTime() ? enabled : false;
        },

        onMassRepair: function (bAdd) {
            // Items to process
            var _this = this;
            var items = _this.tbSchedule.getSelectedItems();

            var today = new Date();
            today.setHours(12, 0, 0, 0);
            var oSchedules = [];
            for (var i = 0; i < items.length; i++) {
                var item = items[i].getBindingContext("wb").getObject();

                // What to insert
                oSchedules.push({
                    Datum: today,
                    Werks: item.Swerk,
                    Equnr: item.Equnr // Ilart:
                });
            }

            // And show dialog
            _this.onShowRepairDialog(oSchedules, bAdd);
        },

        onShowRepairDialog: function (oSchedules, bAdd) {
            var _this = this;

            // No rights for action
            var wbMechanic = _this.getModel("userInfo").getProperty("/WbMechanic") === true;
            if (!wbMechanic)
                return;

            // create dialog
            if (!_this._repairDialog) {
                _this._repairDialog = new SelectDialog({
                    contentWidth: "50%",

                    items: {
                        path: "/",
                        template: new sap.m.StandardListItem({
                            title: "{text_kz}",
                            description: "{text_ru}",
                            info: "{code}",
                            highlight: "{= ${code}.length > 0 ? 'Success' : 'Error'}"
                        })
                    },

                    search: function (oEvent) {
                        var sValue = oEvent.getParameter("value");
                        var oBinding = oEvent.getSource().getBinding("items");
                        oBinding.filter(
                            new Filter({
                                filters: [
                                    new Filter("text_kz", FilterOperator.Contains, sValue),
                                    new Filter("text_ru", FilterOperator.Contains, sValue)],
                                and: false
                            }));
                    },

                    confirm: function (oEvent) {
                        var aContexts = oEvent.getParameter("selectedContexts");
                        if (!aContexts || !aContexts.length)
                            return;

                        var schedules = _this._repairDialog._oSchedules;
                        var code = aContexts[0].getObject().code;

                        for (var i = 0; i < schedules.length; i++) {
                            var schedule = schedules[i];
                            schedule.Ilart = code;
                            _this.updateSchedule(schedule);
                        }

                        // Hide selection
                        _this.tbSchedule.removeSelections(true);
                        _this.setScheduleButtons({JUST_HIDE: true});
                    }
                });

                _this._repairDialog.addStyleClass(this.getContentDensityClass());
            }
            _this._repairDialog._oSchedules = oSchedules;

            // Add item or delete ?
            var jsonModel = new JSONModel(formatter.getUrl('/json/repairReason' + (bAdd ? '' : 'Del') + '.json'));
            _this._repairDialog.setModel(jsonModel);

            _this._repairDialog.open();
        },

        updateSchedule: function (schedule) {
            var _this = this;
            var oWbModel = _this.getModel("wb");
            var bAdd = !!schedule.Ilart;

            // Error handler
            var textParams = [schedule.Ilart, ' - ' + _this.alphaOut(schedule.Equnr), ' - ' + _this.toLocaleDate(schedule.Datum), ' - ' + schedule.Werks];
            var handler = {
                success: function () {
                    MessageToast.show(_this.getBundle().getText(bAdd ? "okCreateItem" : "okRemoveItem", textParams));
                    oWbModel.refresh();
                },

                error: function (err) {
                    _this.showError(err, _this.getBundle().getText("errCreateItem", textParams));
                }
            };

            if (bAdd)
                _this.getOwnerComponent().modifyWrapper("CREATE", '/Schedules', schedule, handler);
            else
                _this.getOwnerComponent().modifyWrapper("DELETE", "/Schedules(Datum=" + _this.getDateUrl(schedule.Datum) + ",Equnr='" +
                    schedule.Equnr + "',Werks='" +
                    schedule.Werks + "')",
                    null,
                    handler);
        },

        getDateUrl: function (date) {
            return formatter.isNodeJs() ?
                this.toSqlDate(date) :
                "datetime'" + encodeURIComponent(this.toSqlDateTime(date)) + "'";
        }
    });
});