"use strict";

const Db = require('../util/Db');
const Status = require('../util/Status');

const {getWerksR3Clause} = require('./user_info')();

module.exports = (app, srv) => {
    const {Waybill, GasSpent, VCountWB, VCountREQ} = srv.entities('wb.db');

    //////////////////////////////////////////////////////////////////////////////
    app.all("/select/prevGas", (req, res) => {

        let statement =
            "SELECT w.id, w.Spent1, w.Spent2, w.Spent4, p.*\n" +
            "FROM _WAYBILL_ as w Right JOIN _GASSPENT_ as p ON p.Waybill_Id = w.Id\n" +
            "WHERE w.Equnr = '_EQUNR_' AND p.PtType IN (1, 2, 4) AND w.CloseDate = (SELECT max(i.CloseDate)\n" +
            "FROM _WAYBILL_ as i\n" +
            "WHERE i.Status = _STATUS_ID_ AND i.Equnr = w.Equnr)\n" +
            "ORDER BY p.PtType, p.Pos;";

        // replace with data
        statement = statement
            .replace(/_WAYBILL_/g, Waybill["@cds.persistence.name"])
            .replace('_GASSPENT_', GasSpent["@cds.persistence.name"])
            .replace('_EQUNR_', req.query.equnr)
            .replace('_STATUS_ID_', Status.CLOSED);

        // Read from DB
        // const tx = cds.transaction(req);
        // tx.run(statement); const rows =
        // Db.close(tx);

        cds.run(statement).then(rows => {
            let prevPetrol = null;
            const prevPetrolList = [];
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (Number(Db.readProperty(row, 'Pos')) === 0) {
                    const ptType = Db.readProperty(row, 'PtType');
                    prevPetrol = {
                        PtType: ptType,
                        GasBefore: Db.readProperty(row, 'Spent' + ptType),
                        GasMatnr: ''
                    };
                    prevPetrolList.push(prevPetrol);
                }
                if (prevPetrol == null)
                    continue;

                prevPetrol.GasMatnr = Db.readProperty(row, 'GasMatnr');
                prevPetrol.GasBefore -= (
                    Number(Db.readProperty(row, 'GasBefore')) + Number(Db.readProperty(row, 'GasGiven')));
            }

            // Change sign
            for (let i = 0; i < prevPetrolList.length; i++)
                prevPetrolList[i].GasBefore = Math.abs(prevPetrolList[i].GasBefore);

            res.json(prevPetrolList);
        }).catch(err => {
            console.log('prevGas=', err);
        });
    });

    //////////////////////////////////////////////////////////////////////////////
    app.all("/count/wb", (req, res) => {
        doCount(req, res, VCountWB);
    });

    //////////////////////////////////////////////////////////////////////////////
    app.all("/count/req", (req, res) => {
        doCount(req, res, VCountREQ);
    });
};


function doCount(req, res, Entity) {
    let statement =
        "SELECT Status as STATUS, sum(cnt) AS CNT FROM _VIEW_NAME_ _WHERE_ GROUP BY Status ORDER BY Status;";

    // Based on rights
    let where = getWerksR3Clause(req);
    if (where)
        where = 'WHERE Werks ' + where;

    statement = statement
        .replace('_VIEW_NAME_', Entity["@cds.persistence.name"])
        .replace('_WHERE_', where);

    // const tx = cds.transaction(req);
    // tx.run(statement);
    cds.run(statement).then(items => {
        res.json(items);
    }).catch(err => {
        console.log('doCount=', err);
    });
    //Db.close(tx);
}