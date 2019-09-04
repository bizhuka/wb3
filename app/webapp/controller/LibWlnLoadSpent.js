sap.ui.define([
        'sap/ui/base/Object'
    ], function (BaseObject) {
        "use strict";

        return BaseObject.extend("com.modekzWaybill.controller.LibWlnLoadSpent", {
            owner: null,
            wlnModel: null,

            constructor: function (owner, objExt) {
                var _this = this;
                _this.owner = owner;

                $.ajax({
                    dataType: "json",
                    url: "/././wialon/getSpentByWialon?wialonId=" + objExt.wialonId + "&from=" + objExt.fromDate + "&to=" + objExt.toDate,
                    success: function (result) {
                        objExt.wlnOk();

                        // If have additional functionality
                        if (objExt.wlnCallback)
                            objExt.wlnCallback(result);
                    },
                    error: function () {
                        objExt.wlnError();
                    }
                });
            }
        });
    }
);