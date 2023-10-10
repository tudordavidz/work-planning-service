const request = require('supertest');
const { expect } = require('chai');
const app = require('./app'); 
const { db, closeDB } = require('./database');


function runQuery(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

describe('API Routes', function() {
    before(function() {
        return runQuery('DELETE FROM shifts')
            .then(() => runQuery('DELETE FROM workers'))
            .then(() => runQuery(`INSERT INTO workers(name) VALUES (?)`, ["John Doe"]))
            .then(({ lastID: workerId }) => runQuery(`INSERT INTO shifts(worker_id, shift_date, shift_start, shift_end) VALUES (?, ?, ?, ?)`, [workerId, '2023-10-10', 8, 16]));
        });
   
    // Create a new worker
    describe('POST /workers/create', function() {
        it('should create a new worker', function(done) {
            request(app)
                .post('/workers/create')
                .send({ name: "Jane Doe" })
                .expect(200)
                .end(function(err, res) {
                    expect(res.body.message).to.equal('Worker created successfully.');
                    done(err);
                });
        });

    });



    // Retrieve all workers with their shifts
    describe('GET /shiftsWithWorkers', function() {
        it('should retrieve all workers with their shifts', function(done) {
            request(app)
                .get('/shiftsWithWorkers')
                .expect(200)
                .end(function(err, res) {
                    expect(res.body).to.be.an('array');
                    done(err);
                });
        });
    });

        // Update a worker
    describe('PUT /workers/update/:id', function() {
        it('should update a worker', function(done) {
            request(app)
                .put('/workers/update/1')
                .send({ name: "Jane Smith" })
                .expect(200)
                .end(function(err, res) {
                    expect(res.text).to.equal('Worker updated successfully.');
                    done(err);
                });
        });
    });

    // Retrieve all workers
    describe('GET /workers', function() {
        it('should retrieve all workers', function(done) {
            request(app)
                .get('/workers')
                .expect(200)
                .end(function(err, res) {
                    expect(res.body).to.be.an('array');
                    done(err);
                });
        });
    });

    // Add a shift for a worker
    describe('POST /shifts/add/:idWorker', function() {
        it('should add a shift for a worker', function(done) {
            request(app)
                .post('/shifts/add/2')
                .send({ shift_start: 8 })
                .expect(200)
                .end(function(err, res) {
                    expect(res.text).to.equal('Shift added successfully.');
                    done(err);
                });
        });
    });

    // Retrieve a specific worker with their shifts by ID
    describe('GET /shifts/:idWorker', function() {
        it('should retrieve shifts for a worker', function(done) {
            request(app)
                .get('/shifts/1')
                .expect(200)
                .end(function(err, res) {
                    expect(res.body).to.have.property('name');
                    expect(res.body).to.have.property('shifts');
                    done(err);
                });
        });
    });

    // Update a shift
    describe('PUT /shifts/update/:id', function() {
        it('should update a shift', function(done) {
            request(app)
                .put('/shifts/update/1')
                .send({ shift_date: '2023-10-11', shift_start: 16 })
                .expect(200)
                .end(function(err, res) {
                    expect(res.text).to.equal('Shift updated successfully.');
                    done(err);
                });
        });
    });

    // Retrieve all shifts
    describe('GET /shifts', function() {
        it('should retrieve all shifts', function(done) {
            request(app)
                .get('/shifts')
                .expect(200)
                .end(function(err, res) {
                    expect(res.body).to.be.an('array');
                    done(err);
                });
        });
    });

    // Delete a worker and their shifts
    describe('DELETE /workers/delete/:id', function() {
        it('should delete a worker and their shifts', function(done) {
            request(app)
                .delete('/workers/delete/1')
                .expect(200)
                .end(function(err, res) {
                    expect(res.text).to.equal('Worker and their shifts deleted successfully.');
                    done(err);
                });
        });
    });


    // Delete a shift
    describe('DELETE /shifts/delete/:id', function() {
        it('should delete a shift', function(done) {
            // Assuming 1 is an ID of a shift in the database.
            request(app)
                .delete('/shifts/delete/1')
                .expect(200)
                .end(function(err, res) {
                    expect(res.text).to.equal('Shift deleted successfully.');
                    done(err);
                });
        });
    });



    after(function(done) {
        this.timeout(5000); // sets timeout to 5 seconds
        closeDB((err) => {
            if (err) return done(err);
            done();
        });
    });
    
    
});

