App.TotalsController = Ember.ArrayController.extend({
    password: null,
    admin: function () {
        return this.get('password') === App.get('PASSWORD');
    }.property('password'),

    tbodyClass: function () {
        return this.get('tbodyLargeFont') ? "tbodyLarge" : "tbodySmall";
    }.property('tbodyLargeFont'),
    tbodyLargeFont: true,

    numberPlaces: 3,
    sortProperties: ['group'],
    sortAscending: false,

    changed: false,

    groupedResults: function () {
        return App.get('utils').getTotalList(this.get('filteredContent'), this.get('numberPlaces'));
    }.property('filteredContent', 'numberPlaces'),

    filteredContent: function () {
        this.set('changed', false);
        return this.get('arrangedContent');
    }.property('arrangedContent', 'content.length', 'changed'),

    actions: {
        sortBy: function (property) {
            this.set('sortProperties', [property]);
        }
    }
});

App.TotalsRoute = Ember.Route.extend({
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
            this.controller.set('filtersn', '');
            return true;
        }
    }
});