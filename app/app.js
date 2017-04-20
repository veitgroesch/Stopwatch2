App = Ember.Application.create({
    LOG_TRANSITIONS: true,
    NUMBER_RACES: 6,
    NUMBER_LAPS: 6,
    PASSWORD: 'cmd',
    LENGTH_COURSE: 2100, //Länge des Kurses
    NUMBER_PICS: 3,  //Anzahl der Plätze mit Bild in der Siegerliste (-1 für alle)
    GROUPS_CARS: ['0', '5', '6', '7', '8', '9'],
    GROUPS_BIKES: ['1', '2', '3', '4'],
    GEWERTETE_LAEUFE: [2, 3, 5, 6],
    LETZTER_LAUF_GEFAHREN: true,
    MINDESTANZAHL_LAUEFE: '3',

    winnerlist: [],
    utils: {
        processWinners: function (filteredContent, lastRace, minRaces, racesToCount) {
            var result = [];
            filteredContent.forEach(function (item) {
                // group data on Startnummer
                var startnummer = item.get('startnummer');

                var hasStartnummer = result.findBy('startnummer', startnummer);
                if (!hasStartnummer) {
                    result.pushObject(Ember.Object.create({
                        startnummer: startnummer,
                        position: 0,
                        name: item.get('name'),
                        car: item.get('car'),
                        year: item.get('year'),
                        delta: 0,
                        velocity: 0,
                        filename: '',
                        error: false,
                        errorMessage: '',
                        laps: []
                    }));
                }
                result.findBy('startnummer', startnummer).get('laps').pushObject(item);
            });
            // Gleich Token in laps zu races bündeln
            result.forEach(function(car) {
                // Gleich Token in laps zu races bündeln
                car.set('races', []);
                car.get('laps').forEach(function(lap){
                    var token = lap.get('token');
                    if (!car.get('races').findBy('token', token)){
                        var error = (lap.get('error') === 1);
                        var abort = (lap.get('abort') === 1);
                        var lauf = lap.get('nlauf');
                        car.get('races').pushObject(Ember.Object.create({
                            token: token,
                            error: error,
                            abort: abort,
                            lauf: lauf,
                            meanDelta: 0,
                            laps: [],
                            velocity: 0
                        }));
                    }
                    car.get('races').findBy('token', token).get('laps').pushObject(lap);
                });
                delete car.laps;
                // Deltas und v berechnen:
                car.get('races').forEach(function (race) {
                    App.get('utils').calculateDelta(race);
                    delete race.laps;
                    //Markieren, ob race gewertet wird
                    if (racesToCount.findBy('id', race.get('lauf')).checked) {
                        race.set('inWertung', true);
                    } else {
                        race.set('inWertung', false);
                    }
                });
                // Testen, ob die Bedingungen erfüllt sind
                var nRaces = 0;
                var lastRaceDriven = false;
                var sumDelta = 0;
                var sumVelocity = 0;
                var nDelta = 0;
                var lastRaceLauf = 0;
                racesToCount.forEach(function(item){
                    if (item.id > lastRaceLauf) {lastRaceLauf = item.id;}
                });
                car.get('races').forEach(function(race){
                    if (race.get('lauf') == lastRaceLauf && !race.get('abort')) {
                        lastRaceDriven = true;
                    }
                    if (race.get('inWertung') && !race.get('abort')){
                        nRaces++;
                        if (!race.get('error')) {
                            nDelta++;
                            sumDelta += race.get('meanDelta');
                            sumVelocity += race.get('velocity');
                        }
                    }
                });
                if (nRaces < minRaces) {
                    car.set('error', true);
                    car.set('errorMessage', 'Zu wenige Läufe gefahren! ');
                }
                if (lastRace && !lastRaceDriven) {
                    car.set('error', true);
                    car.set('errorMessage', car.get('errorMessage') + 'Letzer Lauf nicht gefahren!');
                }
                if (car.get('error')) {
                   car.set('delta', 100000);
                } else {
                    if (nDelta > 0) {
                        car.set('delta', Math.round(sumDelta / nDelta * 10) / 10);
                        car.set('velocity', Math.round(sumVelocity / nDelta));
                    }
                }
            });
            //sortieren und Position einschreiben
            result = result.sortBy('delta');
            var pos = 1;
            result.forEach(function(item){
                item.set('position', pos++);
            });
            return result;
        },
        calculateDelta: function(race) {
            race.set('laps', race.get('laps').sortBy('date'));
            var setzrunde = 0;
            var m = 0; // number items for display
            var sumDelta = 0;
            var nDelta = 0;
            var sumTime = 0;
            var nTime = 0;
            var errorMessage = "";

            race.get('laps').forEach(function (item) {
                var isSetzrunde = false;
                m++;
                if (item.get('gueltig') && setzrunde === 0) {
                    setzrunde = item.get('laptime');
                    isSetzrunde = true;
                }
                var delta = Math.round((item.get('laptime') - setzrunde) * 10) / 10;
                item.set('delta', delta);
                item.set('isSetzrunde', isSetzrunde);
                if (item.get('gueltig') && !isSetzrunde) {
                    sumDelta += Math.abs(delta);
                    nDelta++;
                }
                if (item.get('gueltig')) {
                    sumTime += item.get('laptime');
                    nTime++;
                }
            });
            for (var i = 0; i < App.get('NUMBER_LAPS') - m + 1; i++) {
                race.get('laps').pushObject(Ember.Object.create({
                    empty: true
                }));
            }
            if (nDelta > 0){
                race.set('meanDelta', Math.round(sumDelta / nDelta * 10) / 10);
            }
            race.set('velocity', Math.round(App.get('LENGTH_COURSE') / sumTime * 3.6));
            return race;
        },
        processLaps: function (filteredContent, sortByDelta) {
            var result = [];
            filteredContent.forEach(function (item) {
                // for the checkboxes
                item.set('checked', item.get('gueltig') === 1);
                // group data on token
                var token = item.get('token');
                var startnummer = item.get('startnummer');
                var date = item.get('date');

                var hasToken = result.findBy('token', token);
                if (!hasToken) {
                    var error = (item.get('error') === 1);
                    var abort = (item.get('abort') === 1);
                    var rowBackgroundClass = "rowBackgroundOk";
                    if (error) {rowBackgroundClass = "rowBackgroundError";}
                    if (abort) {rowBackgroundClass = "rowBackgroundAbort";}
                    result.pushObject(Ember.Object.create({
                        token: token,
                        startnummer: startnummer,
                        error: error,
                        abort: abort,
                        rowBackgroundClass: rowBackgroundClass,
                        laps: []
                    }));
                }
                result.findBy('token', token).get('laps').pushObject(item);
            });
            result.forEach(function (race) {
                App.get('utils').calculateDelta(race);
            });

            if (sortByDelta) {
                return result.sortBy('meanDelta');
            } else {
                return result.sortBy('startnummer');
            }
        },
        createCSV: function (JSONData, ReportTitle, ShowLabel) {
            var separator = ';';
            //If JSONData is not an object then JSON.parse will parse the JSON string in an Object
            var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;

            var CSV = 'sep=' + separator + '\r\n\n';
            //Set Report title in first row or line

            CSV += ReportTitle + '\r\n\n';

            //This condition will generate the Label/Header
            if (ShowLabel) {
                var rowl = "";

                //This loop will extract the label from 1st index of on array
                for (var index in arrData[0]) {

                    //Now convert each value to string and comma-separated
                    rowl += index + separator;
                }

                rowl = rowl.slice(0, -1);

                //append Label row with line break
                CSV += rowl + '\r\n';
            }

            //1st loop is to extract each row
            for (var i = 0; i < arrData.length; i++) {
                var row = "";

                //2nd loop will extract each column and convert it in string comma-seprated
                for (var j in arrData[i]) {
                    var value = arrData[i][j].toString();
                    value = value.replace(/\./g, ",");
                    row += '"' + value + '"' + separator;
                }

                row.slice(0, row.length - 1);

                //add a line break after each row
                CSV += row + '\r\n';
            }

            if (CSV === '') {
                alert("Invalid data");
                return;
            }

            //Generate a file name
            //this will remove the blank-spaces from the title and replace it with an underscore
            //fileName += ReportTitle.replace(/ /g, "_");
            var fileName = ReportTitle;

            //Initialize file format you want csv or xls
            var uri = 'data:text/csv;charset=utf-8,' + escape(CSV);

            // Now the little tricky part.
            // you can use either>> window.open(uri);
            // but this will not work in some browsers
            // or you will not get the correct file extension

            //this trick will generate a temp <a /> tag
            var link = document.createElement("a");
            link.href = uri;

            //set the visibility hidden so it will not effect on your web-layout
            link.style = "visibility:hidden";
            link.download = fileName + ".csv";

            //this part will append the anchor tag and remove it after automatic click
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
})
;

App.ApplicationAdapter = DS.RESTAdapter.extend({
    namespace: 'api'
});

App.Lap = DS.Model.extend({
    startnummer: DS.attr(),
    token: DS.attr(),
    nlauf: DS.attr(),
    gueltig: DS.attr(),
    laptime: DS.attr(),
    name: DS.attr(),
    car: DS.attr(),
    year: DS.attr(),
    date: DS.attr(),
    error: DS.attr(),
    abort: DS.attr()
});

App.Router.map(function () {
    this.resource('watches');
    this.resource('laps');
    this.resource('winners');
});




