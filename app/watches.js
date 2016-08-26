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
    laeufe: [
        {name: "Trainingslauf", id: 0},
        {name: "1.Wertungslauf", id: 1},
        {name: "2.Wertungslauf", id: 2},
        {name: "3.Wertungslauf", id: 3},
        {name: "4.Wertungslauf", id: 4},
        {name: "5.Wertungslauf", id: 5}
    ],
    nlauf: 0,

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
});