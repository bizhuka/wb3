sap.ui.define([
        'sap/ui/base/Object',
        'sap/ui/model/json/JSONModel',
        'sap/ui/core/MessageType'
    ], function (Object, JSONModel, MessageType) {
        "use strict";

        return Object.extend("com.modekzWaybill.control.SapMessageDialog", {
            owner: null,
            messageDialog: null,

            constructor: function (owner) {
                this.owner = owner;
            },

            openMessageDialog: function (data) {
                var _this = this;
                if (!_this.messageDialog)
                    _this.messageDialog = this.owner.createFragment("com.modekzWaybill.control.SapMessageDialog", this);

                var result = true;
                for (var i = 0; i < data.length; i++)
                    switch (data[i].messageType) {
                        case 'E':
                        case 'X':
                        case 'A':
                            data[i].type = MessageType.Error;
                            result = false;
                            break;

                        case 'W':
                            data[i].type = MessageType.Warning;
                            break;

                        case 'S':
                        case 'I':
                            data[i].type = MessageType.Information;
                            break;

                        default:
                            data[i].type = MessageType.None;
                    }

                // Set data
                _this.messageDialog.setModel(new JSONModel({
                    items: data
                }), "mes");

                _this.messageDialog.open();

                // Has errors ?
                return result;
            },

            onMessageClose: function () {
                if (this.messageDialog)
                    this.messageDialog.close();
            },

            onMessageAfterClose: function () {
                this.messageDialog.destroy();
                this.messageDialog = null;
            }
        });
    }
);