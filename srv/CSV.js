"use strict";
const multiparty = require('multiparty');
const util = require('util');
const fs = require('fs');

module.exports = (app, srv) => {
    const {Driver, Equipment, EqunrGrp} = srv.entities('wb.db');

    const UPDATED = 'U';
    const INSERTED = 'I';
    const DELETED = 'D';

    //////////////////////////////////////////////////////////////////////////////
    app.all("/csv/uploadDriverMedCards", async (req, res) => {
        // await dbUpdateInfoPlus(req, 4, async function (result) {
        let result = {
            data: [
                ['BR_CODE', '111', 'TTT', '751202301311']
            ]
        };

        const tx = cds.transaction(req);
        for (let i = 0; i < result.data.length; i++) {
            const item = result.data[i];
            
            const updCnt = await tx.run(
                UPDATE(Driver).set({
                    Barcode: item[0]
                }).where({
                    Stcd3: item[3]
                })
            );

            // Info about update
            result.data[i].updCnt = updCnt;
            if (updCnt > 0)
                result.data[i].result = UPDATED;
        }
        
        console.log(JSON.stringify(result));

        res.status(200).json(result);
        // });

    });

    app.all("/csv/uploadEquipment", async (req, res) => {
        // await dbUpdateInfoPlus(req, 6, async function (result) {
        let result = {
            data: [
                ['1040', '1040', 'КАМАЗ-111', 'ТОО СТРОЙМАШ', 'ZZZ77701', '02_05_04']
            ]
        };

        const tx = cds.transaction(req);
        for (let i = 0; i < result.data.length; i++) {
            const item = result.data[i];

            // Works + Plate
            const equnr = ("ID_" + item[1] + "_" + item[4]).replace("\\s+", "");

            const eoKey = {Equnr: equnr};
            let eo = await tx.run(
                SELECT.from(Equipment)
                    .where(eoKey));

            if (!eo || eo.length === 0) {
                item.result = INSERTED;
                result.inserted++;
                eo = {
                    Equnr: equnr
                }
            } else {
                item.result = UPDATED;
                result.updated++;
                eo = eo[0];
            }

            eo.Bukrs = item[0];
            eo.Swerk = item[1];
            eo.Eqktx = item[2];
            eo.TooName = item[3];
            eo.License_num = item[4];

            // Delete leading zero
            eo.OrigClass = item[5];
            if (eo.OrigClass.startsWith("0"))
                eo.OrigClass = eo.OrigClass.substring(1);

            // Change to group
            eo.N_class = eo.OrigClass;
            let equnrGrp = await tx.run(
                SELECT.from(EqunrGrp)
                    .where({
                        Ktsch: eo.OrigClass
                    }));
            if (equnrGrp && equnrGrp.length > 0)
                eo.N_class = equnrGrp[0].Grp;

            switch (item.result) {
                case INSERTED:
                    await tx.run(
                        INSERT.into(Equipment).entries(eo)
                    );
                    break;

                case UPDATED:
                    await tx.run(
                        UPDATE(Equipment).set(eo).where(eoKey)
                    );
                    break;
            }
        }
        await tx.commit();
        
        console.log(JSON.stringify(result));
        res.status(200).json(result);
        // });
    });
};

async function dbUpdateInfoPlus(req, count, callBack) {
    const form = new multiparty.Form();

    form.parse(req, async function (error, field, file) {
        const path = file.id_csv_uploader[0].path;
        const readFile = util.promisify(fs.readFile);

        // TODO use string
        const text = await readFile(path, 'utf8');
        fs.unlink(path);

        const result = {
            data: [],
            result: '',

            inserted: 0,
            updated: 0,
            deleted: 0,
            dbcnt: 0
        };

        const lines = text.split("\\r?\\n");
        for (let i = 0; i < lines.length; i++) { // TODO from 1 or JSON ?
            const line = lines[i];
            const parts = line.split(";");
            if (parts.length !== count)
                continue;

            result.data.push(parts)
        }

        callBack(result);
    });
}