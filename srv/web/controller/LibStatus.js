sap.ui.define([
        'sap/ui/base/Object',
        'sap/ui/model/json/JSONModel'
    ], function (Object, JSONModel) {
        "use strict";

        // Fill from java & node.js
        var allTexts = null;

        // For speed
        var cache = {};

        return Object.extend("com.modekzWaybill.controller.LibStatus", {
            owner: null,

            // Waybill statuses
            NOT_CREATED: 0,
            CREATED: 10,
            //AGREED: 20,
            REJECTED: 30,
            IN_PROCESS: 40,
            ARRIVED: 50,
            CLOSED: 60,

            // Request statuses
            RC_NEW: 100,
            RC_SET: 200,
            RC_DONE: 300,

            // Request waybill_id field
            WB_ID_NULL: -1,
            WB_ID_REJECTED: -2,

            // Delay status
            DR_NO_DELAY: 1000,

            WB_STATUS: "WB", // Waybill
            RC_STATUS: "RC", // Request confirm
            RR_STATUS: "RR", // Request reject
            DR_STATUS: "DR", // Delay reason

            constructor: function (owner, texts) {
                owner.getView().setModel(new JSONModel(this), "status");
                this.owner = owner;
                allTexts = texts;
            },

            getStatusLangArray: function (name) {
                // Already prepared
                if (cache[name])
                    return cache[name];

                // Return as an array
                var result = [];

                // Detect language
                var lang = this.owner.getBundle().getText('lang') === 'ru' ? 'Ru' : 'Kz';
                for (var i = 0; i < allTexts.length; i++) {
                    var item = allTexts[i];

                    // Type of status
                    if (item.Stype !== name)
                        continue;

                    result.push({
                        key: parseInt(item.Id),
                        text: item[lang],
                        messageType: item.MessageType,
                        inTile: item.InTile === "X"
                    });
                }
                result.sort(function (a, b) {
                    return a.key - b.key;
                });

                // Save and return
                cache[name] = result;
                return result;
            },

            getStatusLangText: function (name, id) {
                if (id === undefined)
                    return "-Error-";

                var arr = this.getStatusLangArray(name);
                for (var i = 0; i < arr.length; i++) {
                    var item = arr[i];
                    if (Number(item.key) === Number(id))
                        return item.text;
                }

                // No mapping
                return "-E-" + id + "-E-";
            },

            findStatus: function (name, id) {
                var allStatus = this.getStatusLangArray(name);
                for (var i = 0; i < allStatus.length; i++)
                    if (Number(allStatus[i].key) === Number(id))
                        return allStatus[i];
                return false;
            }
        });
    }
);