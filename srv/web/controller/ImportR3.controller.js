sap.ui.define([
    'com/modekzWaybill/controller/BaseController',
    'sap/m/MessageToast',
    'sap/ui/core/MessageType',
    'sap/ui/unified/FileUploader',
    'sap/ui/unified/FileUploaderParameter',
    'sap/ui/model/json/JSONModel'
], function (BaseController, MessageToast, MessageType, FileUploader, FileUploaderParameter, JSONModel) {
    "use strict";

    return BaseController.extend("com.modekzWaybill.controller.ImportR3", {
        onInit: function () {
            // call base init
            BaseController.prototype.onInit.apply(this, arguments);
        },

        importWerks: function () {
            this.updateDbFrom({
                link: "/r3/WERK?_persist=true",

                title: this.getBundle().getText("werksBukrs")
            });
        },

        importGasType: function () {
            this.updateDbFrom({
                link: "/r3/GAS_TYPE?_persist=true",

                title: this.getBundle().getText("materials")
            });
        },

        uploadEqunrGrp: function () {
            this.updateDbFrom({
                link: "/r3/EQUNR_GRP?_persist=true",

                title: this.getBundle().getText("equnrGrp")
            });
        },

        uploadStatusText: function () {
            this.updateDbFrom({
                link: "/r3/STATUS_TEXT?_persist=true",

                title: this.getBundle().getText("statusText")
            });
        },

        loadWlnVehicle: function () {
            this.updateDbFrom({
                link: "/wialon/loadWlnVehicle",

                title: this.getBundle().getText("wialonObjects")
            });
        },

        uploadDriverMedCards: function () {
            var bundle = this.getBundle();
            this.loadFromFile({
                title: bundle.getText("medCards"),
                url: "./csv/uploadDriverMedCards",
                columns: [
                    bundle.getText("iin"),
                    bundle.getText("pernr"),
                    bundle.getText("worker"),
                    bundle.getText("medCard")
                ]
            });
        },

        uploadEquipment: function () {
            var bundle = this.getBundle();
            this.loadFromFile({
                title: bundle.getText("tooCars"),
                url: "./csv/uploadEquipment",
                columns: [
                    bundle.getText("bukrs"),
                    bundle.getText("werks"),
                    bundle.getText("carName"),
                    bundle.getText("too"),
                    bundle.getText("plateNum"),
                    bundle.getText("class")
                ]
            });
        },

        // uploadGroupRoles: function () {
        //     var bundle = this.getBundle();
        //     this.loadFromFile({
        //         title: bundle.getText("grpRoles"),
        //         url: "./csv/uploadGrpRoles",
        //         columns: [
        //             "+ / -",
        //             bundle.getText("grpRole"),
        //             bundle.getText("indRole")
        //         ],
        //         sortBy: new sap.ui.model.Sorter("COL_1", null, function (oContext) {
        //             var v = oContext.getProperty("COL_1");
        //             return {key: v, text: v};
        //         })
        //     });
        // },

        loadFromFile: function (params) {
            var _this = this;

            // Dynamic columns
            var columns = [];
            var cells = [];
            for (var i = 0; i < params.columns.length; i++) {
                columns.push(new sap.m.Column({header: new sap.m.Label({text: params.columns[i]})}));
                cells.push(new sap.m.Label({text: "{COL_" + i + "}"}));
            }
            // Show results in table
            var table = new sap.m.Table({
                columns: columns
            });
            table.bindAggregation("items", "/items", new sap.m.ColumnListItem({
                cells: cells,
                highlight: {
                    parts: [{path: 'flag'}],

                    formatter: function (flag) {
                        switch (flag) {
                            case 'I':
                                return MessageType.Success;
                            case 'U':
                                return MessageType.Information;
                            case 'D':
                                return MessageType.Error;
                        }
                        return MessageType.None;
                    }
                }
            }));

            var fileUploader = new FileUploader('id_csv_uploader', {
                uploadUrl: params.url,

                // Can change http headers
                sendXHR: true,

                uploadComplete: function (oEvent) {
                    // Whole data
                    var response = JSON.parse(oEvent.getParameter("responseRaw"));

                    // Data model
                    var data = {
                        items: []
                    };

                    // First line headers
                    for (var i = 0; i < response.items.length; i++) {
                        var resItem = response.items[i];
                        var parts = resItem.data;

                        // update info
                        var item = {
                            flag: resItem.result
                        };
                        // Add fields to item
                        for (var p = 0; p < parts.length; p++)
                            item["COL_" + p] = parts[p];
                        data.items.push(item);
                    }

                    // Set new data
                    dialog.setModel(new JSONModel(data));

                    // Group or sort
                    if (params.sortBy)
                        table.getBinding("items").sort(params.sortBy);

                    _this.showUpdateInfo(response, {
                        title: params.title,
                        afterUpdate: function () {
                            _this.getModel("wb").refresh();
                        }
                    })
                }
            });

            var dialog = new sap.m.Dialog({
                title: params.title,
                contentWidth: "85%",

                subHeader: new sap.m.Bar({
                    contentLeft: [
                        new sap.m.Label({text: _this.getBundle().getText("delimiter") + ": ';'"}),
                        new sap.m.Label({text: _this.getBundle().getText("charset") + ": 'UTF-8'"})
                    ],

                    contentMiddle: [fileUploader],

                    contentRight: [new sap.m.Button({
                        icon: "sap-icon://upload",
                        text: _this.getBundle().getText("import"),
                        press: function () {
                            // Without this param all requests will fail
                            fileUploader.addHeaderParameter(new FileUploaderParameter({
                                name: "slug",
                                value: fileUploader.getValue()
                            }));

                            // Pass anti forgery token
                            fileUploader.addHeaderParameter(new FileUploaderParameter({
                                name: "x-csrf-token",
                                value: _this.getOwnerComponent().csrfToken
                            }));

                            fileUploader.upload();
                        }
                    })]
                }),

                content: [table],

                buttons: [
                    new sap.m.Button({
                        icon: "sap-icon://accept",
                        text: _this.getBundle().getText("cancel"),
                        press: function () {
                            dialog.close();
                        }
                    })],

                afterClose: function () {
                    dialog.destroy();
                }
            });

            dialog.addStyleClass(this.getContentDensityClass());
            dialog.open();
        }

    });
});