sap.ui.define([
        'sap/ui/base/Object',
        'sap/ui/model/json/JSONModel',
        'sap/ui/model/Filter',
        'sap/ui/model/FilterOperator',
        'com/modekzWaybill/model/formatter'
    ], function (Object, JSONModel, Filter, FilterOperator, formatter) {
        "use strict";

        return Object.extend("com.modekzWaybill.controller.LibPetrol", {
            owner: null,

            PT_MAIN: {
                id: 1,
                title: "totalConsumption",
                icon: "sap-icon://mileage",
                inputEnabled: true,
                giveRequired: true
            },

            PT_TOP: {
                id: 2,
                title: "totalConsumptionTop",
                icon: "sap-icon://inventory",
                inputEnabled: true,
                giveRequired: true
            },
            PT_BOOTH: {
                id: 4,
                title: "totalConsumptionBooth",
                icon: "sap-icon://family-protection",
                inputEnabled: true,
                noSource: true
            },
            PT_ALL: {
                id: 0,
                title: "totalConsumptionResult",
                icon: "sap-icon://simulate",
                inputEnabled: false
            },

            arrPtTypes: [],
            mapPtTypes: {},

            constructor: function (owner, textFrag) {
                var _this = this;
                _this.owner = owner;

                // IconTabBar
                var petrolContainer = owner.byId("id_petrol_container");

                // Prepare IconTabFilters
                this.arrPtTypes = [this.PT_MAIN, this.PT_TOP, this.PT_BOOTH, this.PT_ALL];

                // Load fragment from string
                for (var p = 0; p < _this.arrPtTypes.length; p++) {
                    var ptType = _this.arrPtTypes[p];
                    _this.mapPtTypes[ptType.id] = ptType;

                    // set title & icon
                    ptType.title = owner.getBundle().getText(ptType.title);
                    ptType.model = new JSONModel(ptType);

                    // set model & add to tabbar
                    ptType.iconTab = owner.createFragment({
                        fragmentContent: textFrag.replace('{{SPENT_PATH}}', '{wb>Spent' + ptType.id + '}')
                            .replace('{{SPENT_ID}}', 'id_input_spent' + ptType.id)
                    }, _this);
                    ptType.iconTab._PtType = ptType.id;
                    ptType.iconTab.setModel(ptType.model, "petrol");
                    petrolContainer.addItem(ptType.iconTab)
                }
            },

            getEmptyList: function (id) {
                var result = [];
                for (var r = 0; r < 7; r++)
                    result.push({
                        PtType: id,
                        GasMatnr: "",
                        GasBefore: 0,
                        GasGive: 0,
                        GasGiven: 0,
                        GasSpent: 0,
                        GasAfter: 0,
                        GasLgort: ""
                    });
                return result;
            },

            showTabs: function (petrolMode, waybillId) {
                var _this = this;
                this.waybillId = parseInt(waybillId);
                // 0 & 1 only
                petrolMode = parseInt(petrolMode);

                // Prepare IconTabFilters
                for (var p = 0; p < this.arrPtTypes.length; p++) {
                    var ptType = this.arrPtTypes[p];

                    ptType.data = _this.getEmptyList(ptType.id);
                    ptType.model.setProperty("/data", ptType.data);

                    // Check bit is set
                    if (ptType.id !== 0)
                        ptType.iconTab.setVisible((petrolMode & ptType.id) !== 0);
                }

                _this._readGasSpents();
            },

            _readGasSpents: function () {
                var _this = this;
                _this.owner.getOwnerComponent().readWrapper("GasSpents", [
                    new Filter("Waybill_Id", FilterOperator.EQ, _this.waybillId),
                    new Filter("Pos", FilterOperator.BT, 0, _this.PT_ALL.data.length - 1)
                ], function (error, spents) {
                    if (error)
                        return;

                    for (var i = 0; i < spents.length; i++) {
                        var spent = spents[i];
                        var ptType = _this.mapPtTypes[spent.PtType];

                        // Only 2 digits
                        _this.round2Digits(spent, ["GasBefore", "GasGive", "GasGiven", "GasSpent", "GasAfter"]);
                        ptType.data[spent.Pos] = spent;
                    }

                    // Recalc fields
                    _this.onDataChange({
                        setData: true,
                        skipSave: true,
                        skipMessage: true
                    });
                });
            },

            _getHandler: function (updateCount) {
                var _this = this;
                var _owner = _this.owner;

                return {
                    success: function () {
                        if (updateCount) {
                            _owner.getModel("wb").refresh();
                            _this._readGasSpents();
                        }
                    },

                    // Show error
                    error: function (err) {
                        _owner.showError(err, _owner.getBundle().getText("errGasUpdate"));
                    }
                }
            },

            round2Digits: function (obj, flds) {
                // dest = dest || obj;
                for (var i = 0; i < flds.length; i++) {
                    var fld = flds[i];
                    if (obj.hasOwnProperty(fld)) // && (typeof obj[fld] === 'number')
                        obj[fld] = parseFloat(obj[fld]).toFixed(2);
                }
            },

            handle_lgort_f4: function (oEvent) {
                var _this = this;
                var owner = _this.owner;
                var input = oEvent.getSource();

                // Load async
                sap.ui.require(["com/modekzWaybill/control/LgortDialog"], function (LgortDialog) {
                    if (!_this._lgortDialog)
                        _this._lgortDialog = new LgortDialog(owner);

                    var context = input.getBindingContext("petrol");

                    // Get current object
                    var bindObj = owner.getViewBindingObject();

                    _this._lgortDialog.openLgortDialog({
                        lgort: input.getValue(),
                        werks: bindObj.Werks,

                        confirmLgort: function (evt) {
                            // input.setValue();
                            var obj = context.getObject();
                            obj.GasLgort = evt.getParameter("listItem").getBindingContext("wb").getObject().Lgort;
                            var ptTypeId = _this.getControlPtType(input);
                            _this.mapPtTypes[ptTypeId].model.setProperty(context.getPath(), obj);

                            // Save to DB
                            _this.onDataChange({
                                skipMessage: true
                            });
                        }
                    });
                });
            },

            spentIsEnabled: function (Status, CreateDate, WbChangeWialonData, WbChangeWialonDataClose, noSource) {
                // enabled="{= ( %{wb>Status}===${status>/ARRIVED}&amp;&amp;(${userInfo>/WbChangeWialonData}===true||${petrol>/noSource}===true) ) ||
                // ( %{wb>Status}===${status>/CLOSED} &amp;&amp; ${userInfo>/WbChangeWialonDataClose}===true) }"
                var bSameMonth = false;
                if (CreateDate) {
                    var now = new Date();
                    bSameMonth = now.getFullYear() === CreateDate.getFullYear() && now.getMonth() === CreateDate.getMonth();
                }

                return (Status === this.owner.status.ARRIVED && (WbChangeWialonData === true || noSource === true)) ||
                    (Status === this.owner.status.CLOSED && WbChangeWialonDataClose === true && bSameMonth)
            },

            inputIsEnabled: function (inputEnabled, GasMatnr, Status, CreateDate, WbChangeWialonData, WbChangeWialonDataClose, controlName) {
                if (!inputEnabled)
                    return false;

                // Do not check for comboBox
                if (controlName !== '_GasMatnr' && GasMatnr.length === 0)
                    return false;

                var result = false;
                switch (controlName) {
                    case '_GasMatnr':
                        result = (Status === this.owner.status.CREATED || Status === this.owner.status.ARRIVED) && WbChangeWialonData;
                        break;

                    case '_GasBefore':
                        result = (Status === this.owner.status.CREATED) && WbChangeWialonData;
                        break;

                    case '_GasLgort':
                        result = (Status === this.owner.status.CREATED || Status === this.owner.status.ARRIVED) && WbChangeWialonData;
                        break;

                    case '_GasGiven':
                        result = (Status === this.owner.status.ARRIVED) && WbChangeWialonData;
                        break;
                }

                // Second attempt to open field to change
                if (!result) {
                    var bSameMonth = false;
                    if (CreateDate) {
                        var now = new Date();
                        bSameMonth = now.getFullYear() === CreateDate.getFullYear() && now.getMonth() === CreateDate.getMonth();
                    }
                    result = Status === this.owner.status.CLOSED && WbChangeWialonDataClose === true && bSameMonth;
                }

                return result;
            },

            onDataChange: function (oEvent) {
                var _this = this;
                var owner = _this.owner;
                if (oEvent.setData)
                    for (var p = 0; p < this.arrPtTypes.length; p++) {
                        var ptType = this.arrPtTypes[p];
                        ptType.model.setProperty("/data", ptType.data);
                    }

                var bindObj = owner.getViewBindingObject();
                var hasErrors = false;
                for (p = 0; p < this.arrPtTypes.length; p++) {
                    ptType = this.arrPtTypes[p];

                    // Skip overall
                    if (ptType.id === _this.PT_ALL.id)
                        continue;

                    // No need
                    var data = ptType.data;
                    if (data.length === 0)
                        continue;

                    // From wialon
                    var fldName = "Spent" + ptType.id;
                    var gasTotalSpent = parseFloat(bindObj[fldName] ? bindObj[fldName] : 0);

                    for (var i = 0; i < data.length; i++) {
                        var row = data[i];

                        // Blank equals 0
                        row.GasGiven = row.GasGiven ? row.GasGiven : 0;
                        var totalBefore = parseFloat(row.GasBefore) + parseFloat(row.GasGiven);

                        gasTotalSpent -= totalBefore;
                        if (gasTotalSpent > 0) {
                            data[i].GasSpent = totalBefore;
                            data[i].GasAfter = 0;
                        } else {
                            data[i].GasSpent = totalBefore + gasTotalSpent;
                            data[i].GasAfter = -gasTotalSpent;
                            gasTotalSpent = 0;
                        }
                        // Only 2 digits
                        _this.round2Digits(data[i], ["GasBefore", "GasGive", "GasGiven", "GasSpent", "GasAfter"]);

                        // Modify items in DB
                        if (!row.GasMatnr || oEvent.skipSave)
                            continue;

                        // Check Lgort
                        if (!data[i].GasLgort && !oEvent.skipMessage) {
                            owner.showError(null, owner.getBundle().getText("noLgort", [ptType.title, i + 1]));
                            hasErrors = true;
                            continue;
                        }

                        if (oEvent.checkGive && row.GasMatnr && parseFloat(row.GasGive) <= 0 && ptType.giveRequired) {
                            this.showError(null, owner.getBundle().getText("noGas", [ptType.title, i + 1]));
                            hasErrors = true;
                            continue;
                        }

                        // Only this fields
                        var updFields = {
                            GasMatnr: row.GasMatnr,
                            GasBefore: row.GasBefore === null ? undefined : formatter.isV4() ? Number(row.GasBefore) : String(row.GasBefore),
                            GasGive: row.GasGive === null ? undefined : formatter.isV4() ? Number(row.GasGive) : String(row.GasGive),
                            GasGiven: row.GasGiven === null ? undefined : formatter.isV4() ? Number(row.GasGiven) : String(row.GasGiven),
                            GasLgort: row.GasLgort === null ? undefined : row.GasLgort
                        };

                        owner.getOwnerComponent().modifyWrapper('UPDATE', _this.getGasSpentPath(ptType.id, i), updFields, _this._getHandler());
                    }

                    if (gasTotalSpent > 0 && !oEvent.skipMessage) {
                        owner.showError(null, owner.getBundle().getText("moreSpent", [ptType.title, Math.round(gasTotalSpent * 100) / 100]));
                        hasErrors = true;
                        continue;
                    }

                    // And update in model
                    ptType.model.setProperty("/data", data);
                }

                // Update
                var result = _this.calcOverall();
                if (hasErrors)
                    return false;

                return result;
            },

            calcOverall: function () {
                var _this = this;
                var result = _this.getEmptyList(_this.PT_ALL.id);

                for (var p = 0; p < this.arrPtTypes.length; p++) {
                    var ptType = this.arrPtTypes[p];
                    if (ptType.id === _this.PT_ALL.id)
                        continue;

                    var data = ptType.model.getProperty("/data");
                    for (var i = 0; i < data.length; i++) {
                        var item = data[i];

                        // Find index
                        var index = 0;
                        for (var r = 0; r < result.length; r++) {
                            index = r;
                            // empty
                            if (!result[r].GasMatnr)
                                break;

                            if (result[r].GasMatnr === item.GasMatnr && result[r].GasLgort === item.GasLgort)
                                break;
                        }
                        result[index].GasMatnr = item.GasMatnr;
                        result[index].GasLgort = item.GasLgort;
                        result[index].GasSpent += parseFloat(item.GasSpent);
                    }
                }
                // Update
                _this.PT_ALL.model.setProperty("/data", result);

                return result;
            },

            getGasSpentPath: function (ptType, pos) {
                return "/GasSpents(Waybill_Id=" + this.waybillId + formatter.getLongPostfix() + ",PtType=" + ptType + ",Pos=" + pos + ")";
            },

            // From control in table to icon tab
            getControlPtType: function (control) {
                return control.getParent().getParent().getParent()._PtType;
            },

            onMatnrChange: function (param) {
                var _this = this;
                var owner = _this.owner;
                var newObject = param;

                if (param.getSource) {
                    var comboGasType = param.getSource();
                    var gasMatnr = comboGasType.getSelectedKey();

                    // Which pos
                    var id = comboGasType.getId().split("-");
                    id = id[id.length - 1];
                    newObject = {
                        PtType: _this.getControlPtType(comboGasType),
                        Pos: parseInt(id),
                        GasMatnr: gasMatnr
                    };
                }
                newObject.Waybill_Id = formatter.isV4() ? Number(this.waybillId) : String(this.waybillId); // As string!

                var path = _this.getGasSpentPath(newObject.PtType, id);
                if (newObject.GasMatnr === "")
                    owner.getOwnerComponent().modifyWrapper("DELETE", path, null, _this._getHandler(true));
                else {
                    _this.owner.getOwnerComponent().readWrapper("GasSpents", [
                        new Filter("Waybill_Id", FilterOperator.EQ, newObject.Waybill_Id),
                        new Filter("PtType", FilterOperator.EQ, newObject.PtType),
                        new Filter("Pos", FilterOperator.EQ, newObject.Pos)
                    ], function (error, spents) {
                        if (error)
                            return;

                        // TODO test defaults
                        var isUpdate = spents.length > 0;
                        owner.getOwnerComponent().modifyWrapper(
                            isUpdate ? "UPDATE" : "CREATE",
                            isUpdate ? path : "/GasSpents",
                            newObject,
                            _this._getHandler(true));
                    });
                }
                _this.onDataChange({
                    skipSave: true
                });

                // Read from DB
                //TODO owner.readBindingObject();
            },

            // Waybill
            setNewSpent: function (bindingObject) {
                // // Set in UI - No need
                // for (var p = 0; p < this.arrPtTypes.length; p++) {
                //     var ptType = this.arrPtTypes[p];
                //
                //     var spent = bindingObject["Spent" + ptType.id];
                //     if (spent !== undefined)
                //         this.owner.findById('id_input_spent'+ ptType.id).setValue(spent);
                // }

                this.onDataChange({
                    skipSave: true
                });
            },

            // Petrol
            setPrevSpent: function (petrols) {
                if (!petrols || !petrols.length)
                    return;

                for (var i = 0; i < petrols.length; i++) {
                    var petrol = petrols[i];
                    if (!petrol.GasMatnr)
                        continue;

                    var ptType = this.mapPtTypes[petrol.PtType];
                    ptType.data[0].GasMatnr = petrol.GasMatnr;
                    ptType.data[0].GasBefore = petrol.GasBefore;

                    // First position
                    petrol.Pos = 0;
                    petrol.GasBefore = formatter.isV4() ? Number(petrol.GasBefore) : String(petrol.GasBefore);

                    // Refresh
                    ptType.model.setProperty("/data", ptType.data);

                    // Update DB
                    this.onMatnrChange(petrol)
                }
            }
        });
    }
);