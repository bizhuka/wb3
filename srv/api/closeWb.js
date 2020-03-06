"use strict";

const Db = require('../util/Db');
const Time = require('../util/Time');
const Status = require('../util/Status');

module.exports = (app, srv) => {

    //////////////////////////////////////////////////////////////////////////////
    app.all("/measureDoc", async (req, res) => {
        // From js
        const incomingDoc = JSON.parse(req.query.doc); // req.body; // JSON.parse(req.query.doc);

        // JS -> SAP
        const params = {
            IV_DIS_MODE: incomingDoc.disMode,
            IV_MEASUREMENT_POINT: incomingDoc.point,
            IV_EQUNR: incomingDoc.equnr,
            IV_WERKS: incomingDoc.werks,
            IV_GSTRP: incomingDoc.gstrp, // DATE + TIME
            IV_GLTRP: incomingDoc.gltrp, // DATE + TIME
            IV_SHORT_TEXT: incomingDoc.text,
            IV_ODO_DIFF: incomingDoc.odoDiff,
            IV_MOTO_HOUR: incomingDoc.motoHour,
            IT_GAS_SPENT_POS: incomingDoc.spents.map(item => {
                return {
                    MATNR: item.matnr,
                    MENGE: item.menge,
                    LGORT: item.lgort
                }
            })
        };

        // Send as json
        let result = null;
        if (process.env.RFC_TEST === 'true')
            result = {
                docum: '001',
                aufnr: '111',
                messages: [{
                    messageType: 'I',
                    message: 'Ok'
                }]
            };
        else {
            // Call SAP FM
            const rfcClient = await Db.getRfcClient(req);
            if (!rfcClient)
                result = {
                    docum: '000',
                    aufnr: '000',
                    messages: [{
                        messageType: 'E',
                        message: 'Cannot connect to SAP system!'
                    }]
                };
            else {
                const sapResult = await rfcClient.call('Z_WB_MEASURE_DOC', params);
                rfcClient.close();

                // SAP -> JS
                result = {
                    docum: sapResult.EV_DOCUM,
                    aufnr: sapResult.EV_AUFNR,
                    messages: sapResult.CT_MESSAGE.map(item => {
                        return {
                            messageType: item.MESSAGE_TYPE,
                            message: item.MESSAGE
                        }
                    })
                };
            }
        }

        // // TODO Save in the same step ! Close Setp -> delete from ReqHistory
        // const tx = cds.transaction(req);
        // const {Waybill} = srv.entities('wb.db');
        //
        // if (result.messages.length > 0 && result.messages[0].messageType === 'I')
        //     await tx.run(
        //         UPDATE(Waybill).set({
        //             Status: Status.CLOSED,
        //             closeDate: Time.getNow(),
        //             OdoDiff: incomingDoc.odoDiff,
        //             MotoHour: incomingDoc.motoHour,
        //             Spent1: incomingDoc.spent1,
        //             Spent2: incomingDoc.spent2,
        //             Spent4: incomingDoc.spent4,
        //             Docum: result.docum,
        //             Aufnr: result.aufnr
        //         }).where({
        //             Id: parseInt(incomingDoc.waybillId)
        //         })
        //     );
        // Db.close(tx, true);

        // Send as json
        res.json(result);
    })

};