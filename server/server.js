var routes = require('./routers/routes.js');
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var httpStatus = require('http-status-codes');

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var NUMBER_LAPS = 6;

io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('disconnect', function () {
        console.log('a user disconnected');
    });
    //socket.emit('newUser', {hello: 'world'});
});

var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'classicmotordays2017'
});

// logging middleware
app.use(function (req, res, next) {
    console.log(req.method + ' ' + req.url);
    next();
})

// register middleware
app.use('/', express.static(path.join(__dirname, '..')));
app.use(express.static(path.join(__dirname, 'bower_components')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.post('/api/laps', function (req, res) {
    var data = req.body;
    var startnummer = data.lap.startnummer;
    var token = data.lap.token;
    var sql = "INSERT INTO laps (startnummer, token, nlauf, laptime, date) VALUES ('" +
        startnummer +
        "', '" + token +
        "', '" + data.lap.nlauf +
        "', '" + data.lap.laptime +
        "', '" + data.lap.date + "')";
    connection.query(sql,
        function (err, rows, fields) {
            if (err) {
                console.log('error: Database INSERT');
                throw err;
            } else {
                var id = rows.insertId;
                data.lap.id = id;
                //Falls mehr als NUMBER_LAPS Einträge, überflüssigen löschen
                var sql = "SELECT id FROM laps WHERE `token`='" + token + "' ORDER BY date";
                connection.query(sql,
                    function (err, rows, fields) {
                        if (err) {
                            console.log('error: Database Select');
                            throw err;
                        } else {
                            if (rows.length > NUMBER_LAPS + 1) {
                                var idToDelete = rows[rows.length-1].id;
                                var sql = "DELETE FROM laps WHERE id=" + idToDelete;
                                connection.query(sql,
                                    function (err, rows, fields) {
                                        if (err) {
                                            console.log('error: Database DELETE');
                                            throw err;
                                        } else {
                                            console.log('emit', idToDelete);
                                            io.emit('deldata', idToDelete);
                                        }
                                    });
                            }
                        }
                    });

                io.emit('newdata', {});
                res.status(httpStatus.CREATED).json(data);
            }
        });
    var sql = "Select * from cars where `startnummer`='" + startnummer + "'";
    connection.query(sql,
        function (err, rows, fields) {
            if (err) {
                console.log('error: Database Select');
                throw err;
            } else {
                if (rows.length == 0) {
                    var sql = "INSERT INTO cars (startnummer, year, name, car) VALUES ('" +
                        startnummer + "', 'NN', 'NN', 'NN')";
                    connection.query(sql,
                        function (err, rows, fields) {
                            if (err) {
                                console.log('error: Database INSERT');
                                throw err;
                            }
                        });
                }
            }
        });
    var sql = "Select * from status where `token`='" + token + "'";
    connection.query(sql,
        function (err, rows, fields) {
            if (err) {
                console.log('error: Database Select');
                throw err;
            } else {
                if (rows.length == 0) {
                    var sql = "INSERT INTO status (token) VALUES ('" +
                        token + "')";
                    connection.query(sql,
                        function (err, rows, fields) {
                            if (err) {
                                console.log('error: Database INSERT');
                                throw err;
                            }
                        });
                }
            }
        });
});

app.put('/api/laps/:id', function (req, res) {
    var id = req.params.id;
    var lap = req.body.lap;
    var sql = "UPDATE `laps` SET `gueltig`=" + lap.gueltig
        + ",  `laptime`=" + lap.laptime
        + " WHERE `id`=" + id;
    connection.query(sql,
        function (err, rows, fields) {
            if (err) {
                console.log('error: Database UPDATE');
                throw err;
            } else {
                var sql = "UPDATE `status` SET `error`=" + lap.error
                    + ",  `abort`=" + lap.abort
                    + " WHERE `token`=" + lap.token;
                connection.query(sql,
                    function (err, rows, fields) {
                        if (err) {
                            console.log('error: Database UPDATE');
                            throw err;
                        } else {
                            io.emit('changedata', req.params.id);
                            res.status(httpStatus.OK).end();
                        }
                    });
            }
        });
});

app.delete('/api/laps/:id', function (req, res) {
    var sql = "DELETE FROM `laps` WHERE `id`=" + req.params.id;
    connection.query(sql,
        function (err, rows, fields) {
            if (err) {
                console.log('error: Database INSERT');
                throw err;
            } else {
                io.emit('deldata', req.params.id);
                res.status(httpStatus.OK).end();
            }
        });
});

app.get('/api/laps/:id', function (req, res) {
    var sql = "SELECT laps.id, laps.startnummer, laps.token, laps.nlauf, laps.laptime, " +
        "laps.gueltig, laps.date, status.error, status.abort FROM laps " +
        " INNER JOIN status ON laps.token=status.token WHERE laps.id=" + req.params.id;
    connection.query(sql,
        function (err, rows, fields) {
            if (err) {
                console.log('error: Database Select');
                throw err;
            } else {
                var laps = {'laps': rows[0]};
                res.status(httpStatus.OK).json(laps);
            }
        });
});

app.get('/api/laps', function (req, res) {
    var sql = "SELECT laps.id, laps.startnummer, laps.token, laps.nlauf, laps.laptime, " +
        "laps.gueltig, laps.date, cars.year, cars.name, cars.car, status.error, status.abort " +
        "FROM laps INNER JOIN cars ON laps.startnummer=cars.startnummer " +
        "INNER JOIN status ON laps.token=status.token;";
    connection.query(sql,
        function (err, rows, fields) {
            if (err) {
                console.log('error: Database INSERT');
                throw err;
            } else {
                var laps = {'laps': rows};
                res.status(httpStatus.OK).json(laps);
            }
        });
});

app.use(routes);

http.listen(1337, function () {
    console.log('ready on port 1337');
});
