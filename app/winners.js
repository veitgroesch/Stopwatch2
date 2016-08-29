App.WinnersController = Ember.ArrayController.extend({
    password: App.get('PASSWORD'),
    admin: function () {
        return this.get('password') === App.get('PASSWORD');
    }.property('password'),

    tbodyClass: function () {
        return this.get('tbodyLargeFont') ? "tbodyLarge" : "tbodySmall";
    }.property('tbodyLargeFont'),
    tbodyLargeFont: true,

    lastRace: false,
    minRaces: 0,
    filtersn: '',
    changed: false,

    groupedResults: function () {
        return App.get('utils').processWinners(
            this.get('filteredContent'),
            this.get('lastRace'),
            this.get('minRaces'));
    }.property('filteredContent'),

    filteredContent: function () {
        this.set('changed', false);
        var rxsn = new RegExp(this.get('filtersn'), 'gi');
        var laps = this.get('arrangedContent');
        if (this.get('filtersn') === "") {
            return [];
        } else {
            return laps.filter(function (lap) {
                return lap.get('startnummer').substring(0, 1).match(rxsn);
            });
        }
    }.property('minRaces', 'lastRace', 'arrangedContent', 'filtersn', 'content.length', 'changed'),

    actions: {
        createCSV: function () {
            var data = [];
            var groups = this.get('groupedResults');
            groups.forEach(function (group) {
                    var klasse = group.get('group');
                    group.get('cars').forEach(function (car) {
                        var obj = {};
                        obj['Klasse '] = klasse;
                        obj['Startnummer '] = car.get('startnummer');
                        obj['Name '] = car.get('name');
                        obj['Auto '] = car.get('car');
                        obj['Delta '] = car.get('delta');
                        obj['Geschwindigkeit '] = car.get('velocity');
                        data.push(obj);
                    });
                }
            );
            var currentDate = new Date();
            var dateTime = currentDate.getDate() + "." +
                (currentDate.getMonth() + 1) + "." +
                currentDate.getFullYear() + " " +
                currentDate.getHours() + "." +
                currentDate.getMinutes() + " Uhr";
            var filename = 'Siegerliste CMD ' + dateTime;
            App.get('utils').createCSV(data, filename, true);
        },
        sortBy: function (property) {
            this.set('sortProperties', [property]);
        }
    }
});

App.WinnersRoute = Ember.Route.extend({
    model: function () {
        return this.store.find('lap');
    },
    actions: {
        refresh: function () {
            var that = this;
            this.set('model', this.store.find('lap'));
            this.controller.set('changed', true);
        },
        changed: function (id) {
            var that = this;
            this.store.find('lap', id).then(function (lap) {
                if (lap) {
                    lap.reload().then(function () {
                        that.controller.set('changed', true);
                    });
                }
            });
        },
        deleted: function (id) {
            var that = this;
            this.store.find('lap', id).then(function (lap) {
                if (lap) {
                    lap.deleteRecord();
                }
            }).then(function () {
                that.controller.set('changed', true);
            });
        },
        didTransition: function (transition, originRoute) {
            this.controller.set('filtersn', '1');
            return true;
        }
    }
});