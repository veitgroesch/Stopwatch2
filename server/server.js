var routes = require('./routers/routes.js');
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var httpStatus = require('http-status-codes');

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

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
    database: 'classicmotordays2016'
});


//selbstgeschriebene logging middleware
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
    var sql = "INSERT INTO laps (startnummer, token, runde, nlauf, laptime, date) VALUES ('" +
        startnummer +
        "', '" + data.lap.token +
        "', '" + data.lap.runde +
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
                io.emit('changedata', req.params.id);
                res.status(httpStatus.OK).end();
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
    var sql = "SELECT * FROM laps WHERE `id`=" + req.params.id;
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
    var sql = "SELECT laps.id, laps.runde, laps.startnummer, laps.token, laps.nlauf, laps.laptime, " +
        "laps.gueltig, laps.date, cars.year, cars.name, cars.car " +
        "FROM laps INNER JOIN cars ON laps.startnummer=cars.startnummer;";
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
