"use strict";

const Status = require('../util/Status');
const Time = require('../util/Time');

module.exports = (srv) => {

    const {Waybill, ReqHeader, ReqHistory, Schedule, Equipment, GasSpent, Driver} = srv.entities('wb.db');

    ////////////////////////////////////////////////////////////////////////////
    srv.before('UPDATE', 'Drivers', async (req) => {
        const driver = req.data;

        // {"ValidDate":"0001-01-01T00:00:01Z"}
        if (driver.ValidDate === Time.C_NOW)
            driver.ValidDate = Time.getNow();

        return driver;
    });

    //////////////////////////////////////////////////////////////////////////////
    srv.before('UPDATE', 'Equipments', async (req) => {
        const equipment = req.data;

        if (equipment.NoDriverDate === Time.C_NOW)
            equipment.NoDriverDate = Time.getNow();

        return equipment;
    });

    //////////////////////////////////////////////////////////////////////////////
    srv.before('UPDATE', 'ReqHeaders', async (req) => {
        const reqHeader = req.data;

        // Get current Waybill_Id
        const tx = cds.transaction(req);
        const arrReqheader = await tx.run(
            SELECT.from(ReqHeader)
                .where({Objnr: reqHeader.Objnr})
        );
        const Waybill_Id = Number(arrReqheader[0].Waybill_Id);

        // No proper waybill
        if (Waybill_Id === Status.WB_ID_NULL || Waybill_Id === Status.WB_ID_REJECTED)
            return reqHeader;

        // Find waybill status
        const arrWaybill = await tx.run(
            SELECT.from(Waybill)
                .where({id: Waybill_Id})
        );
        if (!arrWaybill)
            return reqHeader;

        // Only if is cancelled
        if (arrWaybill[0].Status_Id < Status.ARRIVED)
            tx.run(
                INSERT.into(ReqHistory).entries({Waybill_Id: Waybill_Id, Objnr: reqHeader.Objnr})
            )
    });

    //////////////////////////////////////////////////////////////////////////////
    srv.before(['CREATE', 'UPDATE'], 'Waybills', async (req) => {
        debugger
        let waybill = req.data;

        for (let key in waybill) {
            // TODO type date?
            if (waybill.hasOwnProperty(key) && key.endsWith('Date')) {
                if (waybill[key] === Time.C_NOW)
                    waybill[key] = Time.getNow();
            }
        }

        // Find old waybill
        const tx = cds.transaction(req);
        let dbWaybill = await tx.run(
            SELECT.from(Waybill)
                .where({Id: waybill.Id})
        );

        // Get first item and update based on status
        if (dbWaybill && dbWaybill.length === 1) {
            dbWaybill = dbWaybill[0];
            dbWaybill.Status_Id = waybill.Status_Id ? waybill.Status_Id : dbWaybill.Status_Id;
            dbWaybill.FromDate = waybill.FromDate ? waybill.FromDate : dbWaybill.FromDate;
            dbWaybill.ToDate = waybill.ToDate ? waybill.ToDate : dbWaybill.ToDate;
            waybill = dbWaybill;
        } else {
            // If new item
            waybill.WithNoReqs = waybill.WithNoReqs === undefined ? false : waybill.WithNoReqs;
        }

        if (waybill.Status_Id !== Status.CREATED && waybill.Status_Id !== Status.IN_PROCESS && //AGREED &&
            waybill.Status_Id !== waybill.Status_Id.REJECTED &&
            waybill.Status_Id !== waybill.Status_Id.CLOSED)
            return waybill;

        switch (waybill.Status_Id) {
            case Status.CREATED:
            case Status.IN_PROCESS: //AGREED:
                // Modify schedule
                let fromDate = new Date(waybill.FromDate);
                const fromDateTime = fromDate.getTime();
                const toDateTime = new Date(waybill.ToDate).getTime();
                while (fromDate.getTime() < toDateTime || fromDate.getTime() === fromDateTime) {

                    // Insert only (no Modify)
                    let schedule = {
                        Datum: Time.getSqlDate(fromDate),
                        Werks: waybill.Werks,
                        Equnr: waybill.Equipment_Equnr,
                        Waybill_Id: waybill.Id
                    };

                    let isModified = await tx.run(
                        UPDATE(Schedule).set(schedule).where({
                            Datum: schedule.Datum,
                            Werks: schedule.Werks,
                            Equnr: schedule.Equnr
                        })
                    );
                    if (!isModified)
                        tx.run(
                            INSERT.into(Schedule).entries(schedule)
                        );

                    // Next date
                    fromDate = new Date(fromDate.getTime() + (1000 * 3600 * 24));
                }
                break;

            // Cancel WB
            case Status.REJECTED:
                tx.run(DELETE.from(Schedule).where({Waybill_Id: waybill.Id}));
                break;

            // Close WB
            case Status.CLOSED:
                tx.run(DELETE.from(ReqHistory).where({Waybill_Id: waybill.Id}));
                break;
        }

        return waybill;
    });

    //////////////////////////////////////////////////////////////////////////////
    srv.after('READ', 'VWaybills', async (result, context) => {
        // Get all waybill ids
        let idsList = '';
        const idsMap = {};
        for (let i = 0; i < result.length; i++) {
            const item = result[i];

            // No waybill id, just count
            if (!item.Id)
                return result;

            if (idsList)
                idsList += (',' + item.Id);
            else
                idsList = ('' + item.Id);

            // What to change
            idsMap[item.Id] = item;
        }

        // Oops
        if (!idsList)
            return result;


        // Fill virtual fields
        let statement =
            '  SELECT w.Id,\n' +
            '    (SELECT COUNT (*) FROM _REQHEADER_ as r WHERE r.Waybill_Id = w.Id) AS req_cnt,\n' +
            '    (SELECT COUNT (*) FROM _SCHEDULE_ as s WHERE s.Waybill_Id = w.Id) AS sch_cnt,\n' +
            '    (SELECT COUNT (*) FROM _REQHISTORY_ as h WHERE h.Waybill_Id = w.Id) AS hist_cnt,\n' +
            '    (SELECT COUNT (*) FROM _GASSPENT_ as g WHERE g.Waybill_Id = w.Id) AS gas_cnt\n' +
            '  FROM _WAYBILL_ as w\n' +
            '  WHERE w.Id IN (_LIST_ID_)';

        statement = statement
            .replace('_WAYBILL_', Waybill["@cds.persistence.name"])
            .replace('_REQHEADER_', ReqHeader["@cds.persistence.name"])
            .replace('_SCHEDULE_', Schedule["@cds.persistence.name"])
            .replace('_REQHISTORY_', ReqHistory["@cds.persistence.name"])
            .replace('_GASSPENT_', GasSpent["@cds.persistence.name"])
            .replace('_LIST_ID_', idsList);

        const tx = cds.transaction(context._.odataReq);
        const items = await tx.run(statement);

        // Add virtual fields info
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const resultItem = idsMap[item.Id];

            // write counts
            resultItem.req_cnt = item.req_cnt;
            resultItem.sch_cnt = item.sch_cnt;
            resultItem.hist_cnt = item.hist_cnt;
            resultItem.gas_cnt = item.gas_cnt;
        }

        // And return
        return result;
    });
};