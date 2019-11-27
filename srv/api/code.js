"use strict";

const Db = require('../util/Db');

module.exports = (app, srv) => {
    //////////////////////////////////////////////////////////////////////////////
    const {StatusText} = srv.entities('wb.db');

    //////////////////////////////////////////////////////////////////////////////
    app.all("/jsCode/statusCF.js", (req, res) => {
        const template = `
            sap.ui.define([], function () { "use strict";
                return {      
                    getCfTexts: function () {
                        return _RESULT_
                    }
                };
            });`;

        // Get current Waybill_Id
        // const tx = cds.transaction(req);
        // const items = await tx.run(
        //     SELECT.from(StatusText)
        // );
        // Db.close(tx);

        cds.run(SELECT.from(StatusText)).then(items => {
            // Send as code
            res.type('application/javascript');
            res.send(template.replace('_RESULT_', JSON.stringify(items)));
        }).catch(err => {
            console.log('statusCF=', err);
        });


    });
};