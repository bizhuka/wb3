sap.ui.define([
    'com/modekzWaybill/controller/BaseController',
    'sap/ui/model/json/JSONModel',
    'sap/ui/core/Fragment',
    'sap/ui/core/UIComponent',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/m/MessageToast',
    'com/modekzWaybill/model/formatter',
    'com/modekzWaybill/controller/LibReqs',
    'com/modekzWaybill/controller/LibChangeStatus',
    'com/modekzWaybill/controller/LibPetrol'
    // 'com/modekzWaybill/jsCode/petrol'
], function (BaseController, JSONModel, Fragment, UIComponent, Filter, FilterOperator, MessageToast, formatter, LibReqs, LibChangeStatus, LibPetrol) {
    "use strict";

    var waybillId, bindingObject;

    var allTabs, driverInput;

    return BaseController.extend("com.modekzWaybill.controller.WaybillDetail", {
        libPetrol: null,
        libReqs: null,
        reqsFilter: null,

        onInit: function () {
            // call base init
            var _this = this;
            BaseController.prototype.onInit.apply(_this, arguments);

            // Load fragment as a text
            var textFrag = sap.ui.loader._.getModuleContent('com/modekzWaybill/view/frag/PetrolFrag.fragment.xml');
            _this.libPetrol = new LibPetrol(_this, textFrag);

            this.libReqs = new LibReqs(this, {
                showActual: true,

                getFilter: function () {
                    return _this.reqsFilter;
                }
            });

            allTabs = this.byId("id_all_tabs");
            driverInput = this.byId("id_driver_input");

            this.getRouter().getRoute("waybillDetail").attachPatternMatched(this._onObjectMatched, this);
        },

        getBindingPath: function (forUpdate) {
            if (forUpdate)
                return "/Waybills(" + waybillId + formatter.getLongPostfix() + ")";
            return "/VWaybills(" + waybillId + formatter.getLongPostfix() + ")";
        },

        getViewBindingObject: function () {
            var _this = this;
            var result = _this.getView().getBindingContext("wb").getObject();

            // TODO fix
            result.OdoDiff = _this.byId("id_wb_odo_diff").getValue();
            result.MotoHour = _this.byId("id_wb_moto_hour").getValue();
            result.Spent1 = _this.findById("id_input_spent1").getValue();
            result.Spent2 = _this.findById("id_input_spent2").getValue();
            result.Spent4 = _this.findById("id_input_spent4").getValue();
            return result;
        },

        onDataReceived: function (oEvent) {
            var _this = this;
            bindingObject = _this.getViewBindingObject();

            var userModel = _this.getModel("userInfo");

            // Prepare reqs tab
            var reqsTab = _this.byId("id_reqs_container");
            var reqsOk = bindingObject.Status !== _this.status.REJECTED;
            var reqsText = _this.getBundle().getText(reqsOk ? "reqs" : "cancelledReqs");

            // Change reqs UI
            _this.libReqs.uiModel.setProperty("/showWbColumn", !reqsOk);
            reqsTab.setIcon(sap.ui.core.IconPool.getIconURI(reqsOk ? "multiselect-all" : "multiselect-none"));
            reqsTab.setTooltip(reqsText);
            _this.byId("id_reqs_title").setText(reqsText);

            var filter = new Filter("Waybill_Id", FilterOperator.EQ, parseInt(waybillId));
            if (reqsOk) {
                _this.reqsFilter = filter;
                _this.libReqs.doFilter(true);
            } else // From history table
                _this.getOwnerComponent().readWrapper("ReqHistorys",
                    [filter],

                    function (error, arr) {
                        if (error)
                            return;

                        var objnrFilter = [];
                        // Add new history filter
                        for (var i = 0; i < arr.length; i++)
                            objnrFilter.push(new Filter("Objnr", FilterOperator.EQ, arr[i].Objnr));

                        // Pass old objnr-s
                        _this.reqsFilter = new Filter({
                            filters: objnrFilter,
                            and: false
                        });

                        _this.libReqs.doFilter(true);
                    }
                );

            // Can change driver
            driverInput.setEnabled(
                bindingObject.Status === _this.status.CREATED && // AGREED
                userModel.getProperty("/WbSetDriver") === true);

            ////////////////////////////////////
            // Was in callBack
            ////////////////////////////////////

            _this.byId("id_eo_tab").bindElement({
                path: "/Equipments('" + bindingObject.Equnr + "')",
                model: "wb"
            });

            // update driver tab
            _this.updateDriverTab();

            // Load async
            sap.ui.require(["com/modekzWaybill/control/DriverDialog"], function (DriverDialog) {
                if (!_this._driverDialog)
                    _this._driverDialog = new DriverDialog(_this);

                // An now set F4 handler
                driverInput.attachValueHelpRequest(function () {
                    _this._driverDialog.openDriverDialog({
                        bindPath: "wb>/VDrivers",

                        text: driverInput.getValue(),

                        bindBukrs: bindingObject.Bukrs,

                        confirmMethod: function (oEvent) {
                            _this.handle_dr_f4Selected(oEvent);
                        }
                    });
                });

                // Use 1 Bukrs only
                _this._driverDialog.filterDrivers("", bindingObject.Bukrs, function (okFilter) {
                    driverInput.getBinding("suggestionItems").filter(okFilter);
                });
            });

            // Hide or show tabs
            var visible = bindingObject.TooName === '-';
            this.byId('id_dr_tab').setVisible(visible);
            this.byId('id_close_tab').setVisible(visible);
            this.byId('id_date_tab').setVisible(visible);

            // Prepare tabs of petrol
            _this.libPetrol.showTabs(bindingObject.PetrolMode, parseInt(waybillId));
        },

        _onObjectMatched: function (oEvent) {
            var _this = this;

            // Called by UI5
            if (oEvent)
                waybillId = oEvent.getParameter("arguments").waybillId;

            // Default tab
            allTabs.setSelectedKey("id_eo_tab");

            // Current waybill
            var path = "wb>" + this.getBindingPath();
            this.getView().bindElement({
                path: path,
                events: {
                    dataReceived: _this.onDataReceived.bind(_this)
                }
            });
            _this.byId("id_eo_tab").bindElement(path);
            _this.byId("id_dr_tab").bindElement(path);


            // Set reqs table busy
            _this.reqsFilter = null;
            _this.libReqs.doFilter(true);
        },

        onWlnMessagePress: function (oEvent) {
            var _this = this;
            if (!bindingObject.GarageDepDate || !bindingObject.GarageArrDate) {
                MessageToast.show(this.getBundle().getText("errNotInGarage"));
                return;
            }

            // Is Not Integer
            if (isNaN(parseFloat(bindingObject.WialonId)) || !isFinite(bindingObject.WialonId)) {
                MessageToast.show(this.getBundle().getText("errMesPointValue"));
                return;
            }

            // Disable for second press
            var button = oEvent.getSource();
            button.setEnabled(false);

            // Which button was pressed
            var id = button.getId().split("-");
            id = id[id.length - 1];

            var objExt = {
                id: id,
                wialonId: bindingObject.WialonId,

                // Date in linux format
                fromDate: parseInt(formatter.checkDate(bindingObject.GarageDepDate).getTime() / 1000),
                toDate: parseInt(formatter.checkDate(bindingObject.GarageArrDate).getTime() / 1000),

                wlnOk: function () {
                    MessageToast.show(_this.getBundle().getText("okWialon"));
                    button.setEnabled(true);
                },

                wlnError: function () {
                    MessageToast.show(_this.getBundle().getText("errWialon"));
                    button.setEnabled(true);
                }
            };

            switch (objExt.id) {
                case "wln_load_spent":
                    objExt.className = "LibWlnLoadSpent";

                    objExt.wlnCallback = function (json) {
                        var oWbModel = _this.getModel("wb");
                        var path = _this.getBindingPath();
                        // debugger
                        bindingObject = _this.getViewBindingObject();

                        // In meters
                        json.OdoDiff /= 1000;
                        // In seconds
                        json.MotoHour /= 3600;

                        // Only 2 digits
                        _this.libPetrol.round2Digits(json, ["OdoDiff", "MotoHour", "Spent1", "Spent2", "Spent4"]);

                        // Set in binding object
                        bindingObject.OdoDiff = json.OdoDiff;
                        bindingObject.MotoHour = json.MotoHour;
                        bindingObject.Spent1 = json.Spent1;
                        bindingObject.Spent2 = json.Spent2;
                        if (json.Spent4 > 0)
                            bindingObject.Spent4 = json.Spent4;

                        // Set in UI
                        _this.byId("id_wb_odo_diff").setValue(bindingObject.OdoDiff);
                        _this.byId("id_wb_moto_hour").setValue(bindingObject.MotoHour);
                        _this.findById("id_input_spent1").setValue(bindingObject.Spent1);
                        _this.findById("id_input_spent2").setValue(bindingObject.Spent2);
                        _this.findById("id_input_spent4").setValue(bindingObject.Spent4);
                        _this.libPetrol.setNewSpent(bindingObject);
                    };
                    break;

                case "wln_show_fuel":
                case "wln_show_map":
                    objExt.className = "LibWlnMessage";
                    break;
            }

            // Use different libraries
            sap.ui.require(["com/modekzWaybill/controller/" + objExt.className], function (WialonLib) {
                new WialonLib(_this, objExt);
            });
        },

        updateDriverTab: function () {
            if (bindingObject.Driver)
                this.byId("id_dr_tab").bindElement({
                    path: "/Drivers(Bukrs='" + bindingObject.Bukrs + "',Pernr='" + bindingObject.Driver + "')",
                    model: "wb"
                });
        },

        on_tab_select: function (oEvent) {
            var key = oEvent.getParameter("selectedKey").split("-");
            var fm = key[key.length - 1] + "_click";

            // Call if exist
            if (this[fm])
                this[fm](oEvent);
        },

        handle_dr_f4Selected: function (oEvent) {
            var _this = this;
            oEvent.cancelBubble();

            var oItem = oEvent.getParameter("selectedItem");
            if (!oItem)
                oItem = oEvent.getParameter("listItem");

            // Current item
            var curDriver = oItem.getBindingContext("wb").getObject();

            // Set new DRIVER
            var obj = {
                //Id: waybillId,
                Driver: curDriver.Pernr,
                Bukrs: curDriver.Bukrs
            };
            bindingObject.Driver = obj.Driver;
            bindingObject.Bukrs = obj.Bukrs;

            // Change in UI Or in 1 level deeper ?
            _this.updateDriverTab();

            _this.getOwnerComponent().modifyWrapper('UPDATE', _this.getBindingPath(true), obj, {
                success: function () {
                    // oWbModel.refresh();
                },

                error: function () {
                    _this.showError(null, _this.getBundle().getText("updateDriverError"));
                }
            });
        },

        on_set_status: function (oEvt) {
            var button = oEvt.getSource();
            var id = button.getId().split("-");
            id = id[id.length - 1];

            var obj = {
                Id: bindingObject.Id
            };
            var _this = this;
            var oWbModel = _this.getModel("wb");

            switch (id) {
                case "id_bt_dep_date": // id_bt_confirm
                    // case "id_bt_dep_date":
                    if (!bindingObject.Driver) {
                        this.showError(null, this.getBundle().getText("noDriver"));
                        allTabs.setSelectedKey("id_dr_tab");
                        return;
                    }

                    if (parseInt(bindingObject.Gas_Cnt) === 0) {
                        this.showError(null, this.getBundle().getText("noGasPos", [""]));
                        allTabs.setSelectedKey("id_close_tab");
                        return;
                    }
                    // Check amount og gas
                    _this.libPetrol.onDataChange({
                        skipSave: true,
                        checkGive: true
                    });

                    if (parseInt(bindingObject.Req_Cnt) === 0) {
                        if (bindingObject.WithNoReqs)
                            MessageToast.show(this.getBundle().getText("noReqs"));
                        else {
                            this.showError(null, this.getBundle().getText("noReqs"));
                            allTabs.setSelectedKey("id_reqs_container");
                        }
                        if (!bindingObject.WithNoReqs)
                            return;
                    }

                    var changeStat = new LibChangeStatus(_this);
                    changeStat.openDialog({
                        origin: _this.status.DR_STATUS,
                        title: _this.getBundle().getText("outGarage"), // Confirm WB
                        ok_text: _this.getBundle().getText("out"), // Confirm
                        text: bindingObject.Description,
                        reason: bindingObject.DelayReason,
                        fromDate: bindingObject.FromDate,
                        toDate: bindingObject.ToDate,
                        dateEdit: false,

                        check: function (block) {
                            // Set from dialog
                            obj.Description = block.text;

                            // Check in DB
                            _this.checkSchedule(bindingObject, function (err_message) {
                                if (err_message) {
                                    _this.showError(null, err_message);
                                    block.afterChecked(false);
                                    oWbModel.refresh();
                                    return;
                                }
                                block.afterChecked(true);
                            });
                        },

                        success: function () {
                            // obj.ConfirmDate = new Date(1);
                            // obj.Status = _this.status.AGREED;
                            obj.GarageDepDate = new Date(1);
                            obj.Status = _this.status.IN_PROCESS;
                            //break;

                            _this.setNewStatus(obj);
                        }
                    });
                    return;

                case "id_bt_cancel":
                    obj.ConfirmDate = new Date(1);
                    obj.Status = _this.status.REJECTED;

                    changeStat = new LibChangeStatus(_this);
                    changeStat.openDialog({
                        origin: _this.status.DR_STATUS,
                        title: _this.getBundle().getText("cancelWb"),
                        ok_text: _this.getBundle().getText("canceling"),
                        text: bindingObject.Description,
                        reason: bindingObject.DelayReason,
                        fromDate: bindingObject.FromDate,
                        toDate: bindingObject.ToDate,
                        dateEdit: false,

                        check: function (block) {
                            obj.Description = block.text;
                            block.afterChecked(true);
                        },

                        success: function () {
                            _this.setNewStatus(obj);
                        }
                    });
                    return;

                case "id_bt_arr_date":
                    obj.GarageArrDate = new Date(1);
                    obj.Status = _this.status.ARRIVED;
                    break;

                case "id_bt_close":
                    var activeTab = allTabs.getSelectedKey();
                    allTabs.setSelectedKey("id_close_tab");
                    if (activeTab !== "id_close_tab") {
                        MessageToast.show(this.getBundle().getText("errCheckSensors"));
                        return;
                    }

                    var bindObj = _this.getViewBindingObject();
                    var odoEmpty = (!parseFloat(bindObj.OdoDiff) && !parseFloat(bindObj.MotoHour));
                    var fuelEmpty = !parseFloat(bindObj.Spent1);

                    if (odoEmpty || fuelEmpty) {
                        this.showError(null, this.getBundle().getText("errEnterSensors"));
                        return;
                    }

                    // Check again
                    if (parseInt(bindingObject.Req_Cnt) === 0) {
                        this.showError(null, this.getBundle().getText("noReqs"));
                        allTabs.setSelectedKey("id_reqs_container");
                        return;
                    }

                    // Reqs not closed yet
                    if (!this.checkReqsStatus())
                        return;

                    var fuelRows = _this.libPetrol.onDataChange({
                        skipSave: true
                    });
                    // Fuel not ok
                    if (fuelRows === false)
                        return;

                    // Same check as in SAP
                    if (bindObj.Mptyp !== "O" && bindObj.Mptyp !== "S") {
                        MessageToast.show(this.getBundle().getText("errMptyp", [bindObj.Mptyp, bindObj.Point]));
                        return;
                    }

                    var spents = [];
                    for (var i = 0; i < fuelRows.length; i++)
                        if (fuelRows[i].GasMatnr)
                            spents.push({
                                matnr: fuelRows[i].GasMatnr,
                                menge: fuelRows[i].GasSpent,
                                lgort: fuelRows[i].GasLgort
                            });

                    button.setEnabled(false);
                    $.ajax({
                        url: '/././measureDoc?doc=' + encodeURIComponent(JSON.stringify({
                            disMode: "N", // As background task
                            point: bindObj.Point,
                            equnr: bindObj.Equnr,
                            werks: bindObj.Werks,
                            gstrp: _this.toSapDateTime(bindObj.GarageDepDate),
                            gltrp: _this.toSapDateTime(bindObj.GarageArrDate),
                            text: _this.getBundle().getText("wbNum", [bindObj.Id]),
                            odoDiff: bindObj.OdoDiff,
                            motoHour: bindObj.MotoHour,
                            spents: spents

                            // TODO Save in the same step
                            // waybillId: bindObj.Waybill_Id,
                            // spent1: bindObj.Spent1,
                            // spent2: bindObj.Spent2,
                            // spent4: bindObj.Spent4,
                        })),
                        type: 'GET',
                        // data: JSON.stringify(),

                        contentType: 'application/json; charset=utf-8',
                        dataType: 'json',
                        success: function (doc) {
                            button.setEnabled(true);

                            // Load async
                            sap.ui.require(["com/modekzWaybill/control/SapMessageDialog"], function (SapMessageDialog) {
                                if (!_this._sapMessageDialog)
                                    _this._sapMessageDialog = new SapMessageDialog(_this);

                                // Check for errors
                                if (!_this._sapMessageDialog.openMessageDialog(doc.messages))
                                    return;

                                // Set new date
                                obj.CloseDate = new Date(1);
                                obj.Status = _this.status.CLOSED;
                                // From sensors
                                obj.OdoDiff = formatter.isV4() ? Number(bindObj.OdoDiff) : String(bindObj.OdoDiff);
                                obj.MotoHour = formatter.isV4() ? Number(bindObj.MotoHour) : String(bindObj.MotoHour);
                                obj.Spent1 = formatter.isV4() ? Number(bindObj.Spent1) : String(bindObj.Spent1);
                                obj.Spent2 = formatter.isV4() ? Number(bindObj.Spent2) : String(bindObj.Spent2);
                                obj.Spent4 = formatter.isV4() ? Number(bindObj.Spent4) : String(bindObj.Spent4);
                                obj.Docum = doc.docum;
                                obj.Aufnr = doc.aufnr;
                                _this.setNewStatus(obj);
                            });
                        },

                        error: function (err) {
                            button.setEnabled(true);
                            _this.showError(err, _this.getBundle().getText("errCloseWb"));
                        }
                    });
                    return;
            }

            _this.setNewStatus(obj);
        },

        setNewStatus: function (obj) {
            var _this = this;

            if (obj.Id && formatter.isV4())
                obj.Id = Number(obj.Id);
            var oWbModel = _this.getModel("wb");
            _this.getOwnerComponent().modifyWrapper('UPDATE', _this.getBindingPath(true), obj, {
                success: function () {
                    // TODO _this.readBindingObject();
                    oWbModel.refresh();
                },
                error: function () {
                    _this.showError(null, _this.getBundle().getText("errWbUpdate"));
                }
            });
        },

        on_wb_print: function (oEvent) {
            if (!this.menu) {
                this.menu = this.createFragment("com.modekzWaybill.view.frag.PrintMenu");
                var url = formatter.getUrl("/json/printOption.json");
                this.menu.setModel(new JSONModel(url), "po");
                this.menu.setModel(new JSONModel(url), "po2");
            }
            this.menu.openBy(oEvent.getSource());
        },

        do_wb_download: function () {
            this.do_wb_print({
                download: true
            });
        },

        do_wb_print: function (oEvent) {
            var po = this.menu.getModel("po").getProperty("/list");
            // Original copy
            var po2 = this.menu.getModel("po2").getProperty("/list");

            // url params
            var params = {
                url: "/././print/doc?",
                id: bindingObject.Id,
                n: "",
                d: oEvent.download ? 1 : 0
            };

            // Create short url (do not pass default values)
            for (var i = 1; i <= po.length; i++) {
                var watermark = po[i - 1];
                var watermark2 = po2[i - 1];

                // As binary
                params.n += watermark.enabled ? "1" : "0";

                // How pass texts
                if (!watermark.enabled)
                    continue;

                if (watermark.kzText !== watermark2.kzText)
                    params["k" + i] = watermark.kzText;

                if (watermark.ruText !== watermark2.ruText)
                    params["r" + i] = watermark.ruText;
            }

            // Get full url
            params.n = parseInt(params.n, 2).toString(16); // From 2 based -> hex
            var docUrl = this.absolutePath(this.navToPost(params, true));

            // Just load for localhost
            if (!oEvent.download && bindingObject.TooName === '-') // docUrl.lastIndexOf('http://localhost', 0) !== 0
                docUrl = "https://view.officeapps.live.com/op/view.aspx?src=" + encodeURIComponent(docUrl);

            // And show in browser
            window.location = docUrl;
        },

        checkReqsStatus: function () {
            var content = this.byId('id_reqs_container').getContent();
            var table = content[content.length - 1];
            var items = table.getItems();

            for (var i = 0; i < items.length; i++) {
                var item = items[i].getBindingContext("wb").getObject();
                if (item.StatusReason === this.status.RC_NEW ||
                    item.StatusReason === this.status.RC_SET) {
                    MessageToast.show(this.getBundle().getText("reqsNotConfirmed", [i + 1]));
                    return false;
                }
            }

            return true;
        },

        on_add_reqs: function () {
            var _this = this;
            var oWbModel = _this.getModel("wb");

            // Set or unset waybillId
            var setWaybillId = function (unset) {
                var selectedItems = _this.addReqsLib.reqTable.getSelectedItems();
                _this.addReqsLib.setWaybillId(selectedItems, {
                    waybillId: bindingObject.Id,
                    unset: unset
                });
                changeReqsDialog.close();
            };

            var changeReqsDialog = new sap.m.Dialog('id_add_reqs_dialog', {
                title: _this.getBundle().getText("addReqs"),
                contentWidth: "85%",

                buttons: [
                    new sap.m.Button({
                        icon: "sap-icon://positive",
                        press: function () {
                            setWaybillId(false);
                        }
                    }),

                    new sap.m.Button({
                        icon: "sap-icon://negative",
                        press: function () {
                            setWaybillId(true);
                        }
                    }),

                    new sap.m.Button({
                        icon: "sap-icon://accept",
                        text: _this.getBundle().getText("cancel"),
                        press: function () {
                            changeReqsDialog.close();
                        }
                    })],

                afterClose: function () {
                    changeReqsDialog.destroy();
                }
            });
            changeReqsDialog.addStyleClass(_this.getContentDensityClass());

            // wtf?
            changeReqsDialog.setModel(oWbModel, "wb");

            // And another PM requests in dialog
            _this.addReqsLib = new LibReqs(_this, {
                showWbColumn: true,
                selectMode: sap.m.ListMode.MultiSelect,
                container: changeReqsDialog.getId(),
                statuses: _this.status.getStatusLangArray(_this.status.WB_STATUS).filter(function (pair) {
                    return pair.key === _this.status.NOT_CREATED || pair.key === _this.status.REJECTED;
                }),

                getFilter: function () {
                    // "0" & Ktsch === N_class
                    var txtKtsch = bindingObject.N_class; // TODO WAS oWbModel.getProperty("/Equipments('" + bindingObject.Equnr + "')").N_class; //.substr(1);

                    return _this.makeAndFilter(
                        // Only use curtain class
                        new Filter("Ktsch", FilterOperator.EQ, txtKtsch),

                        new Filter({
                            filters: [
                                new Filter("Waybill_Id", FilterOperator.EQ, _this.status.WB_ID_NULL), // .EQ NOT_CREATED
                                new Filter("Status", FilterOperator.EQ, _this.status.REJECTED),
                                // Or show current WB
                                new Filter("Waybill_Id", FilterOperator.EQ, bindingObject.Id)
                            ],
                            and: false
                        }))
                }
            });

            changeReqsDialog.open();
        },

        on_save_dates: function (oEvent) {
            var _this = this;
            bindingObject = _this.getViewBindingObject();

            // new value
            var value = new Date(oEvent.getParameter('value'));

            var id = oEvent.getSource().getId().split("-");
            var fldName = id[id.length - 1].substr(2);

            // set new value
            bindingObject[fldName] = value;

            // Update
            _this.getOwnerComponent().modifyWrapper('UPDATE', _this.getBindingPath(true), {
                [fldName]: value
            }, {
                success: function () {
                    MessageToast.show(_this.getBundle().getText("dateTimeUpdated"));
                }
            });
        },

        onGetPrevGasInfo: function (oEvent) {
            var _this = this;
            var button = oEvent.getSource();
            button.setEnabled(false);

            $.ajax({
                url: '/././select/prevGas?equnr=' + bindingObject.Equnr,
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                success: function (petrols) {
                    button.setEnabled(true);

                    _this.libPetrol.setPrevSpent(petrols);
                },

                error: function (err) {
                    button.setEnabled(true);
                    _this.showError(err, _this.getBundle().getText("errGetData"));
                }
            });
        }
    });
});