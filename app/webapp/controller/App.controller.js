sap.ui.define([
    "bookshop/app/Component",

	"sap/ui/core/mvc/Controller",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/Sorter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"sap/ui/model/json/JSONModel",
    'sap/ui/Device',
    'sap/ui/unified/FileUploader',
    'sap/ui/unified/FileUploaderParameter'
], function (Component, Controller, MessageToast, MessageBox, Sorter, Filter, FilterOperator, FilterType, JSONModel, Device, FileUploader, FileUploaderParameter) {
	"use strict";

	return Controller.extend("bookshop.app.controller.App", {

		/**
		 *  Hook for initializing the controller
		 */
		onInit : function () {
			var oMessageManager = sap.ui.getCore().getMessageManager(),
				oMessageModel = oMessageManager.getMessageModel(),
				oMessageModelBinding = oMessageModel.bindList("/", undefined, [],
					new Filter("technical", FilterOperator.EQ, true)),
				oViewModel = new JSONModel({
					busy : false,
					hasUIChanges : false,
					bookEmpty : true,
					order : 0
				});
			this.getView().setModel(oViewModel, "appView");
			this.getView().setModel(oMessageModel, "message");

			oMessageModelBinding.attachChange(this.onMessageBindingChange, this);
			this._bTechnicalErrors = false;
		},


		/* =========================================================== */
		/*           begin: event handlers                             */
		/* =========================================================== */

		/**
		 * Create a new entry.
		 */
		onCreate : function () {
			var oList = this.byId("bookList"),
				oBinding = oList.getBinding("items"),
				// Create a new entry through the table's list binding
				oContext = oBinding.create({
					"title" : "New",
					"stock" : 0
				});

			oContext.created().then(function () {
				oBinding.refresh();
			});

			this._setUIChanges(true);
			this.getView().getModel("appView").setProperty("/bookEmpty", true);

			// Select and focus the table row that contains the newly created entry
			oList.getItems().some(function (oItem) {
				if (oItem.getBindingContext() === oContext) {
					oItem.focus();
					oItem.setSelected(true);
					return true;
				}
			});
		},

		/**
		 * Delete an entry.
		 */
		onDelete : function () {
			var oSelected = this.byId("bookList").getSelectedItem();

			if (oSelected) {
				oSelected.getBindingContext().delete("$auto").then(function () {
					MessageToast.show(this._getText("deletionSuccessMessage"));
				}.bind(this), function (oError) {
					MessageBox.error(oError.message);
				});
			}
		},

		/**
		 * Lock UI when changing data in the input controls
		 * @param {sap.ui.base.Event} oEvt - Event data
		 */
		onInputChange : function (oEvt) {
			if (oEvt.getParameter("escPressed")) {
				this._setUIChanges();
			} else {
				this._setUIChanges(true);
				// Check if the title in the changed table row is empty and set the appView property accordingly
				if (oEvt.getSource().getParent().getBindingContext().getProperty("title")) {
					this.getView().getModel("appView").setProperty("/titleEmpty", false);
				}
			}
		},

		/**
		 * Refresh the data.
		 */
		onRefresh : function () {
			var oBinding = this.byId("bookList").getBinding("items");

			if (oBinding.hasPendingChanges()) {
				MessageBox.error(this._getText("refreshNotPossibleMessage"));
				return;
			}
			oBinding.refresh();
			MessageToast.show(this._getText("refreshSuccessMessage"));
		},

		/**
		 * Reset any unsaved changes.
		 */
		onResetChanges : function () {
			this.byId("bookList").getBinding("items").resetChanges();
			this._bTechnicalErrors = false; // If there were technical errors, cancelling changes resets them.
			this._setUIChanges(false);
		},

		/**
		 * Save changes to the source.
		 */
		onSave : function () {
			var fnSuccess = function () {
				this._setBusy(false);
				MessageToast.show(this._getText("changesSentMessage"));
				this._setUIChanges(false);
			}.bind(this);

			var fnError = function (oError) {
				this._setBusy(false);
				this._setUIChanges(false);
				MessageBox.error(oError.message);
			}.bind(this);

			this._setBusy(true); // Lock UI until submitBatch is resolved.
			this.getView().getModel().submitBatch("bookGroup").then(fnSuccess, fnError);
			this._bTechnicalErrors = false; // If there were technical errors, a new save resets them.
		},

		/**
		 * Search for the term in the search field.
		 */
		onSearch : function () {
			var oView = this.getView(),
				sValue = oView.byId("searchField").getValue(),
				oFilter = new Filter("title", FilterOperator.Contains, sValue);

			oView.byId("bookList").getBinding("items").filter(oFilter, FilterType.Application);
		},

		/**
		 * Sort the table according to the last name.
		 * Cycles between the three sorting states "none", "ascending" and "descending"
		 */
		onSort : function () {
			var oView = this.getView(),
				aStates = [undefined, "asc", "desc"],
				aStateTextIds = ["sortNone", "sortAscending", "sortDescending"],
				sMessage,
				iOrder = oView.getModel("appView").getProperty("/order");

			// Cycle between the states
			iOrder = (iOrder + 1) % aStates.length;
			var sOrder = aStates[iOrder];

			oView.getModel("appView").setProperty("/order", iOrder);
			oView.byId("bookList").getBinding("items").sort(sOrder && new Sorter("title", sOrder === "desc"));

			sMessage = this._getText("sortMessage", [this._getText(aStateTextIds[iOrder])]);
			MessageToast.show(sMessage);
		},

		onMessageBindingChange : function (oEvent) {
			var aContexts = oEvent.getSource().getContexts(),
				aMessages,
				bMessageOpen = false;

			if (bMessageOpen || !aContexts.length) {
				return;
			}

			// Extract and remove the technical messages
			aMessages = aContexts.map(function (oContext) {
				return oContext.getObject();
			});
			sap.ui.getCore().getMessageManager().removeMessages(aMessages);

			this._setUIChanges(true);
			this._bTechnicalErrors = true;
			MessageBox.error(aMessages[0].message, {
				id : "serviceErrorMessageBox",
				onClose : function () {
					bMessageOpen = false;
				}
			});

			bMessageOpen = true;
		},


		/* =========================================================== */
		/*           end: event handlers                               */
		/* =========================================================== */

		/**
		 * Convenience method for retrieving a translatable text.
		 * @param {string} sTextId - the ID of the text to be retrieved.
		 * @param {Array} [aArgs] - optional array of texts for placeholders.
		 * @returns {string} the text belonging to the given ID.
		 */
		_getText : function (sTextId, aArgs) {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sTextId, aArgs);
		},

		/**
		 * Set hasUIChanges flag in View Model
		 * @param {boolean} [bHasUIChanges] - set or clear hasUIChanges
		 * if bHasUIChanges is not set, the hasPendingChanges-function of the OdataV4 model determines the result
		 */
		_setUIChanges : function (bHasUIChanges) {
			if (this._bTechnicalErrors) {
				// If there is currently a technical error, then force 'true'.
				bHasUIChanges = true;
			} else if (bHasUIChanges === undefined) {
				bHasUIChanges = this.getView().getModel().hasPendingChanges();
			}
			var oModel = this.getView().getModel("appView");
			oModel.setProperty("/hasUIChanges", bHasUIChanges);
		},

		/**
		 * Set busy flag in View Model
		 * @param {boolean} bIsBusy - set or clear busy
		 */
		_setBusy : function (bIsBusy) {
			var oModel = this.getView().getModel("appView");
			oModel.setProperty("/busy", bIsBusy);
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

        getBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        uploadDriverMedCards: function () {
            var bundle = this.getBundle(this);
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

        loadFromFile: function (params) {
            var _this = this;

            // // All post request would be checked (So send GET first)
            // var csrfToken;
            // $.ajax({
            //     url: './odata.svc/',
            //     type: "GET",
            //     beforeSend: function (xhr) {
            //         xhr.setRequestHeader("X-CSRF-Token", "Fetch");
            //         xhr.setRequestHeader("cache", "false")
            //     },
            //     complete: function (xhr) {
            //         csrfToken = xhr.getResponseHeader("X-CSRF-Token");
            //     }
            // });

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
                            // // Without this param all requests will fail
                            // fileUploader.addHeaderParameter(new FileUploaderParameter({
                            //     name: "slug",
                            //     value: fileUploader.getValue()
                            // }));
                            // // Pass anti forgery token
                            // fileUploader.addHeaderParameter(new FileUploaderParameter({
                            //     name: "x-csrf-token",
                            //     value: csrfToken
                            // }));

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