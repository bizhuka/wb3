const {Driver, Equipment, EqunrGrp} = cds.entities('wb.db');

module.exports = (srv) => {
    const UPDATED = 'U';
    const INSERTED = 'I';
    const DELETED = 'D';

    //////////////////////////////////////////////////////////////////////////////
    srv.on('csvUploadDriverMedCards', async (req) => {
        const data = req.data;
        const result = dbUpdateInfoPlus(data.csv, 4);

        const tx = cds.transaction(req);
        for (let i = 0; i < result.data.length; i++) {
            const item = result[i];
            const updCnt = await tx.run(
                UPDATE(Driver).set({
                    Barcode: item[0]
                }).where({
                    Stcd3: item[3]
                })
            );

            // Info about update
            if (updCnt > 0)
                result.result = UPDATED;
        }

        req.reply(JSON.stringify(result));
    });

    srv.on('uploadEquipment', async (req) => {
        const data = req.data;
        const result = dbUpdateInfoPlus(data.csv, 6);

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
                    tx.run(
                        INSERT.into(Equipment).entries(eo)
                    );
                    break;

                case UPDATED:
                    tx.run(
                        UPDATE(Equipment).set(eo).where(eoKey)
                    );
                    break;
            }
        }

        req.reply(JSON.stringify(result));
    });
};

function dbUpdateInfoPlus(text, count) {
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

    return result;
}