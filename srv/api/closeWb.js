"use strict";

const Time = require('../util/Time');

// Synchronization with R3
const {getRfcClient} = require('./sync')();

module.exports = (app, srv) => {

    //////////////////////////////////////////////////////////////////////////////
    app.all("/measureDoc", async (req, res) => {
        // // Send as json
        // res.json({
        //     docum: '001',
        //     aufnr: '111',
        //     messages: [{
        //         messageType : 'I',
        //         message: 'Ok'
        //     }]
        // });
        // return;

        // From js
        const measureDoc = JSON.parse(req.query.doc);

        // JS -> SAP
        const params = {
            IV_DIS_MODE: measureDoc.disMode,
            IV_MEASUREMENT_POINT: measureDoc.point,
            IV_EQUNR: measureDoc.equnr,
            IV_WERKS: measureDoc.werks,
            IV_GSTRP: measureDoc.gstrp, // DATE + TIME
            IV_GLTRP: measureDoc.gltrp, // DATE + TIME
            IV_SHORT_TEXT: measureDoc.text,
            IV_ODO_DIFF: measureDoc.odoDiff,
            IV_MOTO_HOUR: measureDoc.motoHour,
            IT_GAS_SPENT_POS: measureDoc.spents.map(item => {
                return {
                    MATNR: item.matnr,
                    MENGE: item.menge,
                    LGORT: item.lgort
                }
            })
        };

        // Call SAP FM
        const rfcClient = await getRfcClient();
        const sapResult = await rfcClient.call('Z_WB_MEASURE_DOC', params);
        rfcClient.close();

        // SAP -> JS
        const result = {
            docum: sapResult.EV_DOCUM,
            aufnr: sapResult.EV_AUFNR,
            messages: sapResult.CT_MESSAGE.map(item => {
                return {
                    messageType: item.MESSAGE_TYPE,
                    message: item.MESSAGE
                }
            })
        };

        // Send as json
        res.json(result);
    })

};