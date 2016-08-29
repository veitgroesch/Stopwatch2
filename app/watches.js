App.WatchesRoute = Ember.Route.extend({
    model: function () {
        return this.store.find('lap');
    },
    actions: {
        deleted: function (id) {
            if (!this.controller.get('dataDeleted')) {
                this.store.find('lap', id).then(function (lap) {
                    if (lap) {
                        lap.deleteRecord();
                    }
                });
            }
            this.controller.set('dataDeleted', false);
        }
    }
});

App.WatchesController = Ember.ArrayController.extend({
    dataDeleted: false,
    races: [],
    nlauf: 1,
    init: function () {
        var n = App.get('NUMBER_RACES');
        for (var i = 1; i <= n; i++) {
            this.get('races').push(
                {name: i + ". Lauf", id: i});
        }
    },
    actions: {
        saveNewRecord: function (newLap) {
            var newLapData = this.store.createRecord('lap');
            newLapData.set('startnummer', newLap.startnummer);
            newLapData.set('token', newLap.token);
            newLapData.set('runde', newLap.runde);
            newLapData.set('nlauf', this.get('nlauf'));
            newLapData.set('laptime', newLap.laptime);
            newLapData.set('setzrunde', newLap.setzrunde);
            newLapData.set('meanDelta', false);
            newLapData.set('sumDelta', newLap.sumDelta);
            newLapData.set('date', newLap.date);
            newLapData.save();
        },
        delete: function (rec) {
            var content = this.get('content');
            var arr = content.filterBy('startnummer', rec.startnummer).filterBy('runde', rec.runde);
            var toDelete = arr[0];

            toDelete.deleteRecord();
            toDelete.save();
        }
    }
})
;