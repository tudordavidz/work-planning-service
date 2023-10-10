const express = require('express');
const bodyParser = require('body-parser');
const { db, initDB, closeDB } = require('./database');
const app = express();
const PORT = 3000;

initDB(); // initialize the database and create table if not exists


app.use(bodyParser.json());


// API to create a new worker
app.post('/workers/create', (req, res) => {
    const { name } = req.body;

    // Ensure the worker name is provided
    if (!name || name.trim().length === 0) {
        return res.status(400).send('Worker name is required.');
    }

    // Insert the new worker into the database
    const stmt = db.prepare(`INSERT INTO workers(name) VALUES (?)`);
    stmt.run([name], function(err) {
        if (err) {
            // This will handle the unique constraint violation as well
            return res.status(500).send(err.message);
        }
        res.send({ message: 'Worker created successfully.', workerId: this.lastID });
    });
});


app.put('/workers/update/:id', (req, res) => {
    const { name } = req.body;
    const workerId = req.params.id;

    db.run(`UPDATE workers SET name = ? WHERE id = ?`, [name, workerId], (err) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        res.send('Worker updated successfully.');
    });
});


// API to retrieve all workers
app.get('/workers', (req, res) => {
    db.all(`SELECT * FROM workers`, [], (err, workers) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        res.send(workers);
    });
});


// API to add a shift for a worker using worker ID in the URL
app.post('/shifts/add/:idWorker', (req, res) => {
    const worker_id = parseInt(req.params.idWorker);
    const { shift_start } = req.body;

    // Determine the current date
    const now = new Date();
    const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Ensure shift_start is one of the allowed values
    if (![0, 8, 16].includes(shift_start)) {
        return res.status(400).send('Invalid shift start time.');
    }

    // Calculate shift_end based on shift_start
    const shift_end = (shift_start + 8) % 24;

    // Check if the worker exists
    db.get(`SELECT * FROM workers WHERE id = ?`, [worker_id], (err, worker) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        if (!worker) {
            return res.status(404).send('Worker not found.');
        }

        // Check if the worker already has a shift on the same date
        db.get(`SELECT * FROM shifts WHERE worker_id = ? AND shift_date = ?`, [worker_id, currentDate], (err, row) => {
            if (err) {
                return res.status(500).send(err.message);
            }
            if (row) {
                return res.status(400).send('Worker already has a shift on this date.');
            }

            // Insert the shift into the database
            db.run(`INSERT INTO shifts(worker_id, shift_date, shift_start, shift_end) VALUES (?, ?, ?, ?)`, [worker_id, currentDate, shift_start, shift_end], (err) => {
                if (err) {
                    return res.status(500).send(err.message);
                }
                res.send('Shift added successfully.');
            });
        });
    });
});


// API to retrieve all workers with their shifts
app.get('/shiftsWithWorkers', (req, res) => {
    db.all(`SELECT * FROM workers`, [], (err, workers) => {
        if (err) {
            return res.status(500).send(err.message);
        }

        const workerShiftPromises = workers.map(worker => 
            new Promise((resolve, reject) => {
                db.all(`SELECT shift_date, shift_start, shift_end FROM shifts WHERE worker_id = ?`, [worker.id], (err, shifts) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    worker.shifts = shifts;
                    resolve({ name: worker.name, shifts: worker.shifts });
                });
            })
        );

        Promise.all(workerShiftPromises)
            .then(result => res.send(result))
            .catch(err => res.status(500).send(err.message));
    });
});


// API to retrieve a specific worker with their shifts by ID
app.get('/shifts/:idWorker', (req, res) => {
    const worker_id = parseInt(req.params.idWorker);

    db.get(`SELECT * FROM workers WHERE id = ?`, [worker_id], (err, worker) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        if (!worker) {
            return res.status(404).send('Worker not found.');
        }

        db.all(`SELECT shift_date, shift_start, shift_end FROM shifts WHERE worker_id = ?`, [worker_id], (err, shifts) => {
            if (err) {
                return res.status(500).send(err.message);
            }
            res.send({ name: worker.name, shifts: shifts });
        });
    });
});






app.put('/shifts/update/:id', (req, res) => {
    const { shift_date, shift_start } = req.body;

    // Validate shift start time
    if (![0, 8, 16].includes(shift_start)) {
        return res.status(400).send('Invalid shift start time.');
    }

    // Calculate shift end time based on the start time
    const shift_end = (shift_start + 8) % 24;

    const shiftId = req.params.id;

    // Fetch the existing shift details to check for date changes
    db.get(`SELECT * FROM shifts WHERE id = ?`, [shiftId], (err, shift) => {
        if (err) {
            return res.status(500).send(err.message);
        }

        if (!shift) {
            return res.status(404).send('Shift not found.');
        }

        const updatedDate = shift_date || shift.shift_date;

        // Check if the worker already has a shift on the updated date
        db.get(`SELECT * FROM shifts WHERE worker_id = ? AND shift_date = ? AND id != ?`, [shift.worker_id, updatedDate, shiftId], (err, existingShift) => {
            if (err) {
                return res.status(500).send(err.message);
            }

            if (existingShift) {
                return res.status(400).send('Worker already has a shift on the updated date.');
            }

            // Update the shift details in the database
            db.run(`UPDATE shifts SET shift_date = ?, shift_start = ?, shift_end = ? WHERE id = ?`, 
                    [updatedDate, shift_start, shift_end, shiftId], (err) => {
                if (err) {
                    return res.status(500).send(err.message);
                }
                res.send('Shift updated successfully.');
            });
        });
    });
});

// API to retrieve all shifts
app.get('/shifts', (req, res) => {
    db.all(`SELECT * FROM shifts`, [], (err, workers) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        res.send(workers);
    });
});


app.delete('/shifts/delete/:id', (req, res) => {
    const shiftId = req.params.id;

    db.run(`DELETE FROM shifts WHERE id = ?`, [shiftId], (err) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        res.send('Shift deleted successfully.');
    });
});

app.delete('/workers/delete/:id', (req, res) => {
    const workerId = req.params.id;

    // Delete the worker's shifts first
    db.run(`DELETE FROM shifts WHERE worker_id = ?`, [workerId], (err) => {
        if (err) {
            return res.status(500).send(err.message);
        }

        // Then delete the worker
        db.run(`DELETE FROM workers WHERE id = ?`, [workerId], (err) => {
            if (err) {
                return res.status(500).send(err.message);
            }
            res.send('Worker and their shifts deleted successfully.');
        });
    });
});


app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});


module.exports = app;
