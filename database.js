const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('./workers.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
});



const initDB = () => {
    db.serialize(() => {
        // Create the workers table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS workers (
                id INTEGER PRIMARY KEY,
                name TEXT UNIQUE
            )
        `);

        // Create the shifts table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS shifts (
                id INTEGER PRIMARY KEY,
                worker_id INTEGER,
                shift_date TEXT,
                shift_start INTEGER,
                shift_end INTEGER,
                UNIQUE(worker_id, shift_date),
                FOREIGN KEY (worker_id) REFERENCES workers(id)
            )
        `);
    });
};

const closeDB = (callback) => {
    db.close(err => {
        if (err) {
            console.error("Error closing the database:", err.message);
            return callback(err);
        }
        console.log("Closed the database connection.");
        callback();
    });
};



module.exports = {
    initDB,
    db,
    closeDB
};
