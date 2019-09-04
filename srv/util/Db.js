module.exports = {

    close: async function (tx, doCommit) {
        if (doCommit || process.platform === 'win32') // SQLITE !
            await tx.commit(true);
    }
};