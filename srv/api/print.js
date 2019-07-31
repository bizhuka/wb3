"use strict";

const Status = require('../util/Status');
// Synchronization with R3
const {rfcClient} = require('./sync')();

module.exports = (app, srv) => {
    const {Waybill, GasSpent, VCountWB, VCountREQ} = srv.entities('wb.db');

    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    app.all("/print/template", async (req, res) => {
        await rfcClient.open();
        const result = await rfcClient.call('Z_WB_PRINT_DOC', {
            IV_OBJID: req.query.objid
        });

        res.contentType(req.query.contentType);
        res.send(result.EV_BIN_DATA);
    });

    //////////////////////////////////////////////////////////////////////////////
    app.all("/print/doc", async (req, res) => {
        //     // Only 1 parameter ?
        //     const waybillId = Number(req.query.id);
        //     const setFile = Number(req.query.d);
        //
        //     const docs = [];
        //     const reqs = [];
        //     const gasSpents = [];
        //
        //     String orig_class = null;
        //     try {
        //         let statement =
        //             "SELECT CURRENT_DATE as Datum, w.Butxt, d.Fio, e.Eqktx, e.License_num, e.Speed_max, e.Pltxt, e.OrigClass, e.TooName, e.Typbz, e.Anln1, waybill.*\n" +
        //             "FROM _WAYBILL_ as waybill\n" +
        //             "left outer join _WERK_ as w on waybill.Werks = w.Werks\n" +
        //             "left outer join _DRIVER_ as d on waybill.Bukrs = d.bukrs and waybill.driver = d.pernr\n" +
        //             "left outer join _EQUIPMENT_ as e on waybill.equnr = e.equnr\n" +
        //             "WHERE waybill.id = _ID_";
        //         statement.setLong(1, waybillId);
        //         ResultSet rs = statement.executeQuery();
        //
        //         // Add single item
        //         WBPrintDoc.PrintDoc root = null;
        //         while (rs.next()) {
        //             // Original document
        //             JSONObject json = new JSONObject(getFileAsString("/json/printOption.json"));
        //             JSONArray jsonArr = json.getJSONArray("list");
        //
        //             // Destination
        //             root = new WBPrintDoc.PrintDoc();
        //             Field[] fieldArr = WBPrintDoc.PrintDoc.class.getDeclaredFields();
        //             Map<String, Field> fieldMap = new HashMap<>();
        //             for (Field field : fieldArr)
        //             fieldMap.put(field.getName(), field);
        //
        //             // From js 16 base -> 2 base
        //             String n = Integer.toBinaryString(Integer.parseInt(request.getParameter("n"), 16));
        //             for (int i = 1; i <= n.length(); i++) {
        //                 // to empty string
        //                 if (n.charAt(i - 1) == '0')
        //                     continue;
        //
        //                 Field kField = fieldMap.get("k" + i);
        //                 Field rField = fieldMap.get("r" + i);
        //                 json = jsonArr.getJSONObject(i - 1);
        //
        //                 // get from file
        //                 kField.set(root, json.getString("kzText"));
        //                 rField.set(root, json.getString("ruText"));
        //
        //                 // kz text - from url
        //                 String k = request.getParameter("k" + i);
        //                 if (k != null)
        //                     kField.set(root, k);
        //
        //                 // ru text - from url
        //                 String r = request.getParameter("r" + i);
        //                 if (r != null)
        //                     rField.set(root, r);
        //             }
        //
        //             orig_class = rs.getString("orig_class");
        //
        //             root.id = rs.getString("id");
        //             root.datum = rs.getDate("datum");
        //             root.bukrsName = rs.getString("butxt");
        //             root.pltxt = rs.getString("pltxt");
        //             root.driverFio = rs.getString("fio");
        //             root.eqktx = rs.getString("eqktx");
        //             root.licenseNum = rs.getString("license_num");
        //             root.speedMax = BigDecimal.valueOf(rs.getDouble("speed_max"));
        //             root.fromDate = rs.getDate("fromdate");
        //             root.toDate = rs.getDate("todate");
        //             root.tooName = rs.getString("tooname");
        //             root.typbz = rs.getString("typbz");
        //             root.anln1 = rs.getString("anln1");
        //
        //             // Delete leading zeros
        //             try {
        //                 root.driver = Integer.parseInt(rs.getString("driver"));
        //             } catch (Exception e) {
        //                 root.driver = 0;
        //             }
        //
        //             docs.add(root);
        //         }
        //
        //         // Requests
        //         if (root != null) {
        //             statement = connection.prepareStatement("select * from wb.dbt::pack.reqheader where waybill_id = ?");
        //             statement.setLong(1, waybillId);
        //             rs = statement.executeQuery();
        //             int num = 0;
        //             while (rs.next()) {
        //                 WBPrintDoc.PrintReq req = new WBPrintDoc.PrintReq();
        //
        //                 req.num = String.valueOf(++num);
        //                 req.waybill_id = rs.getString("waybill_id");
        //                 req.gstrp = rs.getDate("gstrp");
        //                 req.gltrp = rs.getDate("gltrp");
        //
        //                 // Copy from wb for too
        //                 if (!root.tooName.equals("-")) {
        //                     req.gstrp = root.fromDate;
        //                     req.gltrp = root.toDate;
        //                 }
        //
        //                 req.dateDiff = String.valueOf(
        //                     TimeUnit.DAYS.convert(req.gltrp.getTime() - req.gstrp.getTime(), TimeUnit.MILLISECONDS) + 1);
        //                 BigDecimal hours = rs.getBigDecimal("duration");
        //                 if (BigDecimal.ZERO.compareTo(hours) != 0)
        //                     req.duration = "(" + hours + ")";
        //                 req.pltxt = rs.getString("pltxt");
        //                 req.stand = rs.getString("stand");
        //                 req.beber = rs.getString("beber");
        //                 req.ilatx = rs.getString("ilatx");
        //                 req.ltxa1 = rs.getString("ltxa1");
        //
        //                 reqs.add(req);
        //             }
        //
        //             // Just fill with something
        //             List<GasSpent> gasSpentList = em.createQuery(
        //                 "SELECT t FROM GasSpent t WHERE t.Waybill_Id = " + waybillId, GasSpent.class).getResultList();
        //
        //             Map<String, GasSpent> petrolMap = new HashMap<>(gasSpentList.size());
        //             for (GasSpent gasSpent : gasSpentList)
        //             if (!petrolMap.containsKey(gasSpent.GasMatnr))
        //                 petrolMap.put(gasSpent.GasMatnr, gasSpent);
        //             else {
        //                 GasSpent prevGasSpent = petrolMap.get(gasSpent.GasMatnr);
        //                 prevGasSpent.GasBefore.add(gasSpent.GasBefore);
        //                 prevGasSpent.GasGive.add(gasSpent.GasGive);
        //                 prevGasSpent.GasGiven.add(gasSpent.GasGiven);
        //             }
        //             // Pass overalls
        //             gasSpents = new ArrayList<>(petrolMap.values());
        //         }
        //     } catch (Exception e) {
        //         e.printStackTrace();
        //         throw new ServletException(e);
        //     } finally {
        //         em.close();
        //     }
        //
        //     // Pass data for template
        //     WBPrintDoc printDoc = new WBPrintDoc(waybillId, orig_class, docs, reqs, gasSpents);
        //
        //     try (Session session = ODataServiceFactory.getRfcSession().openSession()) {
        //         session.execute(printDoc);
        //
        //         // Specify the filename
        //         sendFile(response, printDoc.data, printDoc.contentType,
        //             setFile == 1 ? printDoc.filename : null);
        //     }
    });
};

