"use strict";

const Db = require('../util/Db');
const Time = require('../util/Time');
const Status = require('../util/Status');
// Synchronization with R3
const {getRfcClient} = require('./sync')();

const util = require('util');
const fs = require('fs');
const readFile = util.promisify(fs.readFile);

module.exports = (app, srv) => {
    const {Waybill, Driver, Werk, Equipment, ReqHeader, GasSpent} = srv.entities('wb.db');

    //////////////////////////////////////////////////////////////////////////////
    app.all("/print/template", async (req, res) => {
        const rfcClient = await getRfcClient();
        const result = await rfcClient.call('Z_WB_PRINT_DOC', {
            IV_OBJID: req.query.objid
        });
        rfcClient.close();

        res.contentType(req.query.contentType);
        res.send(result.EV_BIN_DATA);
    });

    //////////////////////////////////////////////////////////////////////////////
    app.all("/print/doc", async (req, res) => {
        // Only 1 parameter ?
        const waybillId = Number(req.query.id);
        const setFile = Number(req.query.d);

        const docs = [];
        const reqs = [];
        const gasSpents = [];

        let orig_class = null;

        const root = {};
        const tx = cds.transaction(req);
        try {
            let statement =
                "SELECT CURRENT_DATE as Datum, w.Butxt, d.Fio, e.Eqktx, e.License_num, e.Speed_max, e.Pltxt, e.OrigClass, e.TooName, e.Typbz, e.Anln1, waybill.*\n" +
                "FROM _WAYBILL_ as waybill\n" +
                "left outer join _WERK_ as w on waybill.Werks = w.Werks\n" +
                "left outer join _DRIVER_ as d on waybill.Bukrs = d.bukrs and waybill.driver = d.pernr\n" +
                "left outer join _EQUIPMENT_ as e on waybill.equnr = e.equnr\n" +
                "WHERE waybill.id = _ID_";

            // replace with data
            statement = statement
                .replace('_WAYBILL_', Waybill["@cds.persistence.name"])
                .replace('_WERK_', Werk["@cds.persistence.name"])
                .replace('_DRIVER_', Driver["@cds.persistence.name"])
                .replace('_EQUIPMENT_', Equipment["@cds.persistence.name"])
                .replace('_ID_', waybillId);

            // Read from DB
            const rows = await tx.run(statement);

            // Add single item
            const json = JSON.parse(await readFile(Db.getFilePath('json/printOption.json'), 'utf8'));
            for (let i = 0; i < rows.length; i++) {
                const rs = rows[i];

                // From js 16 base -> 2 base
                const n = parseInt(req.query.n, 16).toString(2);
                for (let i = 1; i <= n.length; i++) {
                    // to empty string
                    if (n.charAt(i - 1) === '0')
                        continue;

                    // get from file
                    root["WM_KZ" + i] = json.list[i - 1].kzText;
                    root["WM_RU" + i] = json.list[i - 1].ruText;

                    // kz text - from url
                    const k = req.query["k" + i];
                    if (k)
                        root["WM_KZ" + i] = k;

                    // ru text - from url
                    const r = req.query["r" + i];
                    if (r)
                        root["WM_RU" + i] = r;
                }

                orig_class = Db.readProperty(rs, 'orig_class');

                root.ID = String(Db.readProperty(rs, 'Id'));
                root.DATUM = Time.getSapDate(Db.readProperty(rs, 'Datum'));
                root.BUKRS_NAME = Db.readProperty(rs, 'Butxt');
                root.PLTXT = Db.readProperty(rs, 'Pltxt');
                root.DRIVER_FIO = String(Db.readProperty(rs, 'Fio'));
                root.EQKTX = Db.readProperty(rs, 'Eqktx');
                root.LICENSE_NUM = Db.readProperty(rs, 'License_num');
                root.SPEED_MAX = Number(Db.readProperty(rs, 'Speed_max')); //Double
                root.FROM_DATE = Time.getSapDate(Db.readProperty(rs, 'FromDate'));
                root.TO_DATE = Time.getSapDate(Db.readProperty(rs, 'ToDate'));
                root.TOO_NAME = Db.readProperty(rs, 'TooName');
                root.TYPBZ = Db.readProperty(rs, 'Typbz');
                root.ANLN1 = Db.readProperty(rs, 'Anln1');

                // Delete leading zeros
                root.DRIVER = parseInt(Db.readProperty(rs, 'Driver'));
                if (!root.DRIVER)
                    root.DRIVER = 0;

                docs.push(root);
            }

            // Requests
            if (docs.length > 0) {
                statement = "select * from _REQHEADER_ where waybill_id = _ID_";
                // replace with data
                statement = statement
                    .replace('_REQHEADER_', ReqHeader["@cds.persistence.name"])
                    .replace('_ID_', waybillId);

                // Read from DB
                const rows = await tx.run(statement);
                for (let i = 0; i < rows.length; i++) {
                    const rs = rows[i];
                    const req = {};

                    req.NUM = String(i + 1);
                    req.WAYBILL_ID = String(Db.readProperty(rs, 'Waybill_Id'));
                    req.GSTRP = Time.getSapDate(Db.readProperty(rs, 'Gstrp'));
                    req.GLTRP = Time.getSapDate(Db.readProperty(rs, 'Gltrp'));

                    // Copy from wb for too
                    if (root.tooName !== "-") {
                        req.GSTRP = root.FROM_DATE;
                        req.GLTRP = root.TO_DATE;
                    }

                    req.DATE_DIFF = String(Time.diffInDays(
                        Time.getSqlDate(req.GLTRP), Time.getSqlDate(req.GSTRP)) + 1);
                    if (Db.readProperty(rs, 'Duration'))
                        req.DAUNO = "(" + Db.readProperty(rs, 'Duration') + ")";
                    req.PLTXT = Db.readProperty(rs, 'Pltxt');
                    req.STAND = Db.readProperty(rs, 'Stand');
                    req.BEBER = Db.readProperty(rs, 'Beber');
                    req.ILATX = Db.readProperty(rs, 'Ilatx');
                    req.LTXA1 = Db.readProperty(rs, 'Ltxa1');

                    reqs.push(req);
                }

                // Just fill with something
                const gasSpentList = await tx.run(
                    SELECT.from(GasSpent)
                        .where({
                            Waybill_Id: waybillId
                        }));

                const petrolMap = {};
                for (let g = 0; g < gasSpentList.length; g++) {
                    const gasSpent = gasSpentList[g];
                    const gasSpentSap = {
                        BEFORE: Number(gasSpent.GasBefore),
                        GIVE: Number(gasSpent.GasGive),
                        GIVEN: Number(gasSpent.GasGiven)
                    };

                    if (!petrolMap[gasSpent.GasMatnr]) {
                        petrolMap[gasSpent.GasMatnr] = gasSpentSap;
                        gasSpents.push(gasSpentSap);
                    } else {
                        const prevGasSpent = petrolMap[gasSpent.GasMatnr];
                        prevGasSpent.BEFORE += gasSpentSap.BEFORE;
                        prevGasSpent.GIVE += gasSpentSap.GIVE;
                        prevGasSpent.GIVEN += gasSpentSap.GIVEN;
                    }
                }
            }
        } catch (e) {
            res.json(e.toString());
        } finally {
            await Db.close(tx);
        }

        // Send error
        if (docs.length === 0)
            return;

        const rfcClient = await getRfcClient();
        const result = await rfcClient.call('Z_WB_PRINT_DOC', {
            IV_WAYBILL_ID: String(waybillId),
            IV_CLASS: String(orig_class),
            IT_DOC: docs,
            IT_REQ: reqs,
            IT_GAS: gasSpents
        });
        rfcClient.close();

        res.setHeader('Content-Type', result.EV_CONTENT_TYPE);
        if (setFile === 1)
            res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI(result.EV_FILENAME));
        res.send(result.EV_BIN_DATA);
    });
};

