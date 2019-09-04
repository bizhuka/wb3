sap.ui.define([
        'sap/ui/base/Object',
        'sap/ui/model/json/JSONModel',
        'sap/m/MessageToast',
        'com/modekzWaybill/model/formatter'
    ], function (BaseObject, JSONModel, MessageToast, formatter) {
        "use strict";

        return BaseObject.extend("com.modekzWaybill.controller.LibChangeStatus", {
            owner: null,
            dialog: null,
            gui: null,

            constructor: function (owner) {
                var _this = this;
                _this.owner = owner;
            },

            openDialog: function (gui) {
                var _owner = this.owner;

                switch (gui.origin) {
                    case _owner.status.DR_STATUS:
                        gui.reasons = _owner.status.getStatusLangArray(_owner.status.DR_STATUS).filter(function (pair) {
                            return pair.key !== _owner.status.DR_NO_DELAY;
                        });
                        gui.reasonLabel = _owner.getBundle().getText("delayReason");
                        break;

                    case _owner.status.RC_STATUS:
                        gui.reasons = _owner.status.getStatusLangArray(_owner.status.RC_STATUS).filter(function (pair) {
                            return pair.key !== _owner.status.RC_NEW && pair.key !== _owner.status.RC_SET;
                        });
                        gui.reasonLabel = _owner.getBundle().getText("reqsStatus");
                        break;

                    case _owner.status.RR_STATUS:
                        gui.reasons = _owner.status.getStatusLangArray(_owner.status.RR_STATUS);
                        gui.reasonLabel = _owner.getBundle().getText("reqsRejectStatus");
                        break;
                }
                // No text
                gui.text = gui.text ? gui.text : "";

                // Convert to normal date for odata v4
                if (gui.fromDate)
                    gui.fromDate = formatter.checkDate(gui.fromDate);
                if (gui.toDate)
                    gui.toDate = formatter.checkDate(gui.toDate);

                this.gui = gui;
                this.dialog = this.owner.createFragment("com.modekzWaybill.view.frag.ChangeStatusDialog", this);
                this.dialog.setModel(new JSONModel(this.gui), "gui");
                this.dialog.open();

                // Initial dates
                if (gui.origin === _owner.status.DR_STATUS) {
                    this.owner.findById('id_reason_combo').setEnabled(false);
                    if (gui.fromDate)
                        this.fromTime = gui.fromDate.getTime();

                    if (gui.toDate)
                        this.toTime = gui.toDate.getTime();
                }

                // First time
                this.checkOkEnabled();
            },

            onTextChange: function (oEvent) {
                // After text changed
                this.gui.text = oEvent.getParameter('value');
                this.checkOkEnabled();
            },

            onDateChanged: function () {
                this.checkOkEnabled();

                if (this.gui.origin === this.owner.status.DR_STATUS && this.fromTime && this.toTime)
                    this.owner.findById('id_reason_combo').setEnabled(
                        this.gui.fromDate.getTime() !== this.fromTime ||
                        this.gui.toDate.getTime() !== this.toTime
                    )
            },

            checkOkEnabled: function () {
                var _this = this;
                var okButton = _this.dialog.getBeginButton();

                // By default
                okButton.setEnabled(false);

                // Data and callback
                var combo = this.owner.findById('id_reason_combo');
                var block = {
                    text: _this.gui.text,
                    fromDate: _this.gui.fromDate,
                    toDate: _this.gui.toDate,
                    reason: _this.gui.reason, // combo.getSelectedKey(),

                    afterChecked: function (ok) {
                        okButton.setEnabled(ok);
                    }
                };

                if (this.gui.origin === _this.owner.status.DR_STATUS) {
                    if (block.fromDate)
                        block.fromDate.setHours(12, 0, 0, 0);
                    if (block.toDate)
                        block.toDate.setHours(12, 0, 0, 0);
                }

                // No text
                if (block.text.length === 0)
                    return;

                // Oops
                if (this.gui.dateEdit && (!block.fromDate || !block.toDate || block.fromDate.getTime() > block.toDate.getTime())) {
                    MessageToast.show(this.owner.getBundle().getText("wrongPeriod"));
                    return;
                }

                if (combo.getEnabled() && !block.reason) {
                    MessageToast.show(this.owner.getBundle().getText("fillField", [this.gui.reasonLabel]));
                    return;
                }

                // Do the check
                _this.gui.check.call(this.owner, block);
            },

            onChangeStatusConfirm: function () {
                this.gui.success.call(this);
                this.dialog.close();
            },

            onChangeStatusClose: function () {
                this.dialog.close();
            },

            onChangeStatusAfterClose: function () {
                this.dialog.destroy();
                this.dialog = null;
            }

        });
    }
);