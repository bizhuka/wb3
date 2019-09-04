sap.ui.define([
    "com/modekzWaybill/controller/BaseController",
    "com/modekzWaybill/controller/LibReqs",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, LibReqs, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("com.modekzWaybill.controller.FinishedReqs", {
        onInit: function () {
            // call base init
            var _this = this;
            BaseController.prototype.onInit.apply(_this, arguments);

            // What status to show
            var filtered = _this.status.getStatusLangArray(_this.status.WB_STATUS).filter(function (pair) {
                return pair.key !== _this.status.NOT_CREATED; // && pair.key !== _this.status.REJECTED;
            });

            new LibReqs(this, {
                showWbColumn: true,
                showReason: true,
                showActual: true,
                statuses: filtered,
                reqStatuses: _this.status.getStatusLangArray(_this.status.RC_STATUS).concat(_this.status.getStatusLangArray(_this.status.RR_STATUS)),
                getFilter: function () {
                    return new Filter({
                        filters: [
                            new Filter("Waybill_Id", FilterOperator.NE, _this.status.WB_ID_NULL) // NE NOT_CREATED
                            // new Filter("Status", FilterOperator.NE, _this.status.REJECTED)
                        ],
                        and: true
                    })
                }
            });
        }
    });
});