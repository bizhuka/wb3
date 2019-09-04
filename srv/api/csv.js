"use strict";

const Db = require('../util/Db');
const multer = require('multer');
const upload = multer({storage: multer.memoryStorage()});

module.exports = (app, srv) => {
    const {Driver, Equipment, EqunrGrp} = srv.entities('wb.db');

    const C_UPDATED = 'U';
    const C_INSERTED = 'I';
    const C_DELETED = 'D';

    //////////////////////////////////////////////////////////////////////////////
    app.post("/csv/uploadDriverMedCards", upload.single('id_csv_uploader'), async (req, res) => {
        let result = dbUpdateInfoPlus(req.file, 4);

        const tx = cds.transaction(req);
        for (let i = 0; i < result.items.length; i++) {
            const item = result.items[i];

            const updCnt = await tx.run(
                UPDATE(Driver).set({
                    Barcode: item.data[0]
                }).where({
                    Stcd3: item.data[3]
                })
            );

            // Info about update
            if (updCnt > 0) {
                result.updated++;
                item.status = C_UPDATED;
            }
        }
        await Db.close(tx, true);

        res.status(200).json(result);
    });

    app.post("/csv/uploadEquipment", upload.single('id_csv_uploader'), async (req, res) => {
        let result = dbUpdateInfoPlus(req.file, 6);

        const tx = cds.transaction(req);
        for (let i = 0; i < result.items.length; i++) {
            const item = result.items[i];

            // Works + Plate
            const equnr = ("ID_" + item.data[1] + "_" + item.data[4]).replace("\\s+", "");

            const eoKey = {Equnr: equnr};
            let eo = await tx.run(
                SELECT.from(Equipment)
                    .where(eoKey));

            if (!eo || eo.length === 0) {
                item.status = C_INSERTED;
                result.inserted++;
                eo = {
                    Equnr: equnr
                }
            } else {
                item.status = C_UPDATED;
                result.updated++;
                eo = eo[0];
            }

            eo.Bukrs = item.data[0];
            eo.Swerk = item.data[1];
            eo.Eqktx = item.data[2];
            eo.TooName = item.data[3];
            eo.License_num = item.data[4];

            // Delete leading zero
            eo.OrigClass = item.data[5];
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

            switch (item.status) {
                case C_INSERTED:
                    await tx.run(
                        INSERT.into(Equipment).entries(eo)
                    );
                    break;

                case C_UPDATED:
                    await tx.run(
                        UPDATE(Equipment).set(eo).where(eoKey)
                    );
                    break;
            }
        }
        await Db.close(tx, true);

        res.status(200).json(result);

    });
};

function dbUpdateInfoPlus(data, count) {
    const text = data.buffer.toString();

    const result = {
        items: [],

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

        result.items.push({
            data: parts,
            status: ''
        });
    }

    return result;
}