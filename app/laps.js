App.LapsController = Ember.ArrayController.extend({
    password: App.get('PASSWORD'),
    admin: function () {
        return this.get('password') === App.get('PASSWORD');
    }.property('password'),

    tbodyClass: function () {
        return this.get('tbodyLargeFont') ? "tbodyLarge" : "tbodySmall";
    }.property('tbodyLargeFont'),
    tbodyLargeFont: false,
    tbodyLineBreak: true,

    filtersn: '',
    filterlauf: '1',
    dataDeleted: false,

    sortByDelta: false,
    toggled: false,

    groupedResults: function () {
        return App.get('utils').processLaps(this.get('filteredContent'), this.get('sortByDelta'));
    }.property('filteredContent', 'admin', 'sortByDelta'),

    filteredContent: function () {
        this.set('toggled', false);
        var rxsn = new RegExp(this.get('filtersn'), 'gi');
        var rxlauf = new RegExp(this.get('filterlauf'), 'gi');
        var laps = this.get('arrangedContent');
        if (this.get('filtersn') === "" || this.get('filterlauf') === "") {
            return [];
        } else {
            return laps.filter(function (lap) {
                return lap.get('startnummer').substring(0, 1).match(rxsn) &&
                    lap.get('nlauf').toString().match(rxlauf);
            });
        }
    }.property('arrangedContent', 'filtersn', 'filterlauf', 'content.length', 'toggled'),

    actions: {
        createCSV: function () {
            var data = [];
            var groups = this.get('groupedResults').sortBy('group');
            groups.forEach(function (group) {
                    group.get('races').forEach(function (race) {
                        var obj = {};
                        obj['Startnummer '] = race.get('startnummer');
                        var i = 0;
                        race.get('laps').forEach(function (lap) {
                            if (lap.get('runde') === 0) {
                                obj['Setzrunde '] = lap.get('laptime');
                            } else {
                                if (lap.get('gueltig')) {
                                    obj['Runde ' + i] = lap.get('laptime');
                                } else {
                                    obj['Runde ' + i] = "---";
                                }
                            }
                            i++;
                        });
                        obj['Delta '] = race.get('meanDelta');
                        obj['Geschwindigkeit '] = race.get('velocity');
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
            var filename = 'Ergebnisse CMD ' + dateTime;
            App.get('utils').createCSV(data, filename, true);
        },
        sortBy: function (property) {
            this.set('sortProperties', [property]);
//            this.set('sortAscending', !this.get('sortAscending'));
        },
        delete: function (lap) {
            if (lap) {
                this.set('dataDeleted', true);
                this.store.deleteRecord(lap);
                lap.save();
            }
        },
        deleteStartnummer: function (item) {
            if (item) {
                if (!confirm('Möchten Sie diesen Datensatz wirklich löschen?')) {
                    return;
                }
                var token = item.get('token');
                var toDelete = this.filterBy('token', token);
                toDelete.forEach(function (rec) {
                    Ember.run.once(this, function () {
                        rec.deleteRecord();
                        rec.save();
                    });
                }, this);
            }
        },
        split: function (item) {
            if (item) {
                if (!confirm('Möchten Sie diese Runde wirklich splitten?')) {
                    return;
                }
                var token = item.get('token');
                var nlauf = item.get('nlauf');
                var date = item.get('date');
                var startnummer = item.get('startnummer');
                var that = this;

                var newTime = Math.round(item.get('laptime') * 5) / 10;

                Ember.run.once(this, function () {
                    item.set('laptime', newTime);
                    item.save();
                });
                Ember.run.once(this, function () {
                    var newRecord = that.store.createRecord('lap', {
                        token: token,
                        nlauf: nlauf,
                        startnummer: startnummer,
                        laptime: newTime,
                        gueltig: 1,
                        date: date
                    });
                    newRecord.save();
                });
            }
        },
        decrease: function (item) {
            if (item) {
                var id = item.get('id');
                var toShift = this.filterBy('id', id);
                toShift.forEach(function (rec) {
                    Ember.run.once(this, function () {
                        var oldtime = rec.get('laptime');
                        if (oldtime > 1.0) {
                            var olddelta = rec.get('delta');
                            rec.set('laptime', Math.round(oldtime * 10 - 1) / 10);
                            rec.set('delta', Math.round(olddelta * 10 - 1) / 10);
                            rec.save();
                        }
                    });
                }, this);
            }
        },
        increase: function (item) {
            if (item) {
                var id = item.get('id');
                var toShift = this.filterBy('id', id);
                toShift.forEach(function (rec) {
                    Ember.run.once(this, function () {
                        var oldtime = rec.get('laptime');
                        var olddelta = rec.get('delta');
                        rec.set('laptime', Math.round(oldtime * 10 + 1) / 10);
                        rec.set('delta', Math.round(olddelta * 10 + 1) / 10);
                        rec.save();
                    });
                }, this);
            }
        },
        toggleCheckbox: function (item) {
            if (item) {
                var that = this;
                var lap = this.store.find('lap', item.get('id')).then(function (lap) {
                    if (lap.get('gueltig') === 1) {
                        lap.set('gueltig', 0);
                    } else {
                        lap.set('gueltig', 1);
                    }
                    lap.save();
                    that.set('toggled', true);
                });
            }
        },
        toggleError: function (item) {
            if (item) {
                var that = this;
                var token = item.get('token');
                var lap = this.store.find('lap').then(function (laps) {
                    laps.filterBy('token', token).forEach(function(lap){
                        if (lap.get('error') === 1) {
                            lap.set('error', 0);
                        } else {
                            lap.set('error', 1);
                        }
                        lap.save();
                        that.set('toggled', true);
                    });
                });
            }
        },
        toggleAbort: function (item) {
            if (item) {
                var that = this;
                var token = item.get('token');
                var lap = this.store.find('lap').then(function (laps) {
                    laps.filterBy('token', token).forEach(function(lap){
                        if (lap.get('abort') === 1) {
                            lap.set('abort', 0);
                        } else {
                            lap.set('abort', 1);
                        }
                        lap.save();
                        that.set('toggled', true);
                    });
                });
            }
        }

    }
});

App.LapsRoute = Ember.Route.extend({
    model: function () {
        return this.store.find('lap');
    },
    actions: {
        refresh: function () {
            this.set('model', this.store.find('lap'));
        },
        changed: function (id) {
            var that = this;
            this.store.find('lap', id).then(function (lap) {
                if (lap) {
                    lap.reload().then(function () {
                        that.controller.set('toggled', true);
                    });
                }
            });
        },
        deleted: function (id) {
            if (!this.controller.get('dataDeleted')) {
                this.store.find('lap', id).then(function (lap) {
                    if (lap) {
                        lap.deleteRecord();
                    }
                });
            }
            this.controller.set('dataDeleted', false);
        },
        didTransition: function (transition, originRoute) {
            this.controller.set('filtersn', '1');
            return true;
        }
    }
});