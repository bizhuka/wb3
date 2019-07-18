"use strict";


module.exports = (app, srv) => {
    const userInfo = function () {
        return {
            ok: "ok"
        }
    };

    //////////////////////////////////////////////////////////////////////////////
    app.all("/userInfo", async (req, res) => {

        res.json(req.authInfo)
    });

    return {
        userInfo: userInfo
    }
};