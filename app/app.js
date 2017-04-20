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
        getTotalList: function (filteredContent, numberPlaces) {
            App.get('utils').processData(filteredContent);
            var totallist = App.get('winnerlist');
            var result = [];
            result.pushObject(Ember.Object.create({
                type: 'Automobile',
                cars: []
            }));
            result.pushObject(Ember.Object.create({
                type: 'Motorräder',
                cars: []
            }));
            var autos = result.findBy('type', 'Automobile');
            var motorraeder = result.findBy('type', 'Motorräder');
            totallist.forEach(function (car) {
                var group = car.get('group');
                var startnummer = car.get('startnummer');
                var delta = car.get('delta');
                var v = car.get('velocity');
                var carname = car.get('car');
                var name = car.get('name');
                var year = car.get('year');
                var filename = "assets/pics/" + startnummer + ".jpg";
                var carObj = Ember.Object.create({
                    group: group,
                    startnummer: startnummer,
                    position: 0,
                    delta: delta,
                    velocity: v,
                    car: carname,
                    name: name,
                    year: year,
                    filename: filename
                });
                if (App.get('GROUPS_CARS').indexOf(group) !== -1) {
                    autos.get('cars').pushObject(carObj);
                }
                if (App.get('GROUPS_BIKES').indexOf(group) !== -1) {
                    motorraeder.get('cars').pushObject(carObj);
                }
            });

            result.forEach(function (type) {
                type.set('cars', type.get('cars').sortBy('delta'));
                type.set('cars', type.get('cars').slice(0, numberPlaces));
                var position = 1;
                type.get('cars').forEach(function (car) {
                    car.set('position', position++);
                });
            });

            return result;
        },
        getWinnerList: function (filteredContent) {
            App.get('utils').processData(filteredContent);
            var winnerlist = App.get('winnerlist');
            var result = [];
            winnerlist.forEach(function (car) {
                var group = car.get('group');
                var startnummer = car.get('startnummer');
                var position = car.get('winnerPosition');
                var delta = car.get('delta');
                var v = car.get('velocity');
                var carname = car.get('car');
                var name = car.get('name');
                var year = car.get('year');
                var groupItem = result.findBy('group', group);
                var hasGroup = !!groupItem;
                if (!hasGroup) {
                    result.pushObject(Ember.Object.create({
                        group: group,
                        cars: []
                    }));
                }
                groupItem = result.findBy('group', group);
                var filename = "";
                if (position <= App.get('NUMBER_PICS') || App.get('NUMBER_PICS') === -1) {
                    filename = "assets/pics/" + startnummer + ".jpg";
                }
                groupItem.get('cars').pushObject(Ember.Object.create({
                    startnummer: startnummer,
                    position: position,
                    delta: delta,
                    velocity: v,
                    car: carname,
                    name: name,
                    year: year,
                    filename: filename
                }));
            });
            // Sortieren
            result.forEach(function (group) {
                group.set('cars', group.get('cars').sortBy('position'));
            });
            return result.sortBy('group');
        },
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
            console.log('processWinners', result);
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

        processData: function (filteredContent) {
            var result = [];
            var siegerliste = [];
            var groups = [];
            var that = this;
            filteredContent.forEach(function (item) {
                // for the checkboxes
                item.set('checked', item.get('gueltig') === 1);
                //for arrows
                // group data on first digit of startnummer
                var startnummer = item.get('startnummer');
                var date = item.get('date');
                var token = item.get('token');
                var nlauf = item.get('nlauf');
                var name = item.get('name');
                var year = item.get('year');
                var car = item.get('car');
                var group = startnummer.substring(0, 1);
                // collect groups in groups-array
                if (!groups.findBy('group', group)) {
                    groups.pushObject(Ember.Object.create({
                        group: group
                    }));
                }
                var filteredResult = result.filterBy('nlauf', nlauf);
                var groupItem = filteredResult.findBy('group', group);
                var hasGroup = !!groupItem;
                if (!hasGroup) {
                    result.pushObject(Ember.Object.create({
                        group: group,
                        nlauf: nlauf,
                        nameLauf: App.get('utils').nameLauf(nlauf),
                        token: token,
                        races: []
                    }));
                } else {
                    if (token > groupItem.get('token')) {
                        groupItem.set('token', token);
                    }
                }
                var hasToken = !!result.filterBy('nlauf', nlauf).findBy('group', group).get('races').findBy('token', token);
                if (!hasToken) {
                    result.filterBy('nlauf', nlauf).findBy('group', group).get('races').pushObject(Ember.Object.create({
                        token: token,
                        startnummer: startnummer,
                        nlauf: nlauf,
                        group: group,
                        winnerPosition: 0,
                        winnerPositionName: "",
                        winnerDelta: "",
                        meanDelta: "",
                        name: name,
                        year: year,
                        car: car,
                        laps: []
                    }));
                }
                result.filterBy('nlauf', nlauf).findBy('group', group).get('races').findBy('token', token).get('laps').pushObject(item);
            });
            // Deltas berechnen
            result.forEach(function (groupItem) {
                groupItem.get('races').forEach(function (race) {
                    var meanDelta = 0;
                    // number of deltas to count
                    var n = 0;
                    // number of rounds
                    var m = 0;
                    // total time
                    var t = 0;
                    // mean velocity
                    var v = 0;
                    var nv = 0;
                    race.get('laps').forEach(function (lap) {
                        if (lap.get('runde') > 0 && lap.get('gueltig')) {
                            meanDelta += Math.abs(lap.get('delta'));
                            n++;
                        }
                        if (lap.get('runde') === 0 || lap.get('gueltig')) {
                            t += lap.get('laptime');
                            nv++;
                        }
                        m++;
                    });
                    if (n > 0) {
                        meanDelta = Math.round(meanDelta / n * 10) / 10;
                    }
                    race.meanDelta = meanDelta;
                    if (t > 0) {
                        v = Math.round(App.get('LENGTH_COURSE') * nv / t * 3.6);
                    }
                    race.velocity = v;
                    for (var i = 0; i < App.get('NUMBER_LAPS') - m + 1; i++) {
                        race.get('laps').pushObject(Ember.Object.create({
                            empty: true,
                            runde: '---'
                        }));
                    }
                    // add race to siegerliste
                    if (race.get('nlauf') > 0) {
                        var siegerItem = siegerliste.findBy('startnummer', race.get('startnummer'));
                        var hasSiegerItem = !!siegerItem;
                        if (!hasSiegerItem) {
                            siegerliste.pushObject(Ember.Object.create({
                                group: groupItem.get('group'),
                                startnummer: race.get('startnummer'),
                                nlauf: race.get('nlauf'),
                                delta: 0,
                                name: race.get('name'),
                                car: race.get('car'),
                                year: race.get('year'),
                                velocity: race.get('velocity'),
                                winnerPosition: 0,
                                sumDelta: race.get('meanDelta'),
                                nDelta: 1
                            }));
                        } else {
//                            if (true) {
                            if (race.get('nlauf') === 5) {
                                siegerItem.set('round5', true);
                            }
                            siegerItem.set('sumDelta', siegerItem.get('sumDelta') + race.get('meanDelta'));
                            siegerItem.set('velocity', siegerItem.get('velocity') + race.get('velocity'));
                            siegerItem.set('nDelta', siegerItem.get('nDelta') + 1);
                        }
                    }
                });
                // Nach Deltas sortieren
                groupItem.set('races', groupItem.get('races').sortBy('meanDelta'));

                // set positions to race array
                var position = 0;
                groupItem.get('races').forEach(function (race) {
                    position++;
                    race.position = position;
                });
            });
            siegerliste = siegerliste.filterBy('round5', true);
            // Siegerliste: Deltas berechnen über alle Wertungsläufe
            siegerliste.forEach(function (car) {
                if (car.get('nDelta') > 0) {
                    var delta = Math.round(car.get('sumDelta') / car.get('nDelta') * 10) / 10;
                    car.set('delta', delta);
                    var v = Math.round(car.get('velocity') / car.get('nDelta'));
                    car.set('velocity', v);
                }
            });
            groups.forEach(function (groupItem) {
                var group = groupItem.get('group');
                var races = siegerliste.filterBy('group', group);
                var sortedRaces = races.sortBy('delta');
                var pos = 0;
                sortedRaces.forEach(function (race) {
                    pos++;
                    race.set('winnerPosition', pos);
                });
            });
            result.forEach(function (item) {
                item.get('races').forEach(function (car) {
                    var siegerItem = siegerliste.findBy('startnummer', car.get('startnummer'));
                    if (siegerItem) {
                        var winnerPosition = siegerItem.get('winnerPosition');
                        car.set('winnerPosition', winnerPosition);
                        car.set('winnerPositionName', App.get('utils').nameWinnerPosition(winnerPosition));
                        car.set('winnerDelta', siegerItem.get('delta'));
                    }
                });
            });
            // Nach token (Zeit) sortieren - neueste Rennen zuerst
            result = result.sortBy('token').reverse();

            App.set('winnerlist', siegerliste);
            return result;
        },
        nameWinnerPosition: function (pos) {
            switch (pos) {
                case 0:
                    return "";
                case 1:
                    return "&star;";
                case 2:
                    return "&star;&star;";
                case 3:
                    return "&star;&star;&star;";
                default:
                    return pos + ". Platz";
            }
        },
        nameLauf: function (nlauf) {
            if (nlauf === 0) {
                return "Trainingslauf";
            } else {
                return nlauf + ". Wertungslauf";
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




