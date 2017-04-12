App.StopWatchComponent = Ember.Component.extend({
    time: 0,
    laps: [],
    runde: 0,

    //TODO use this.notifyPropertyChange(key) instead
    lapschanged: false,
    ready: true,

    token: '',

    running: false,
    inputDisabled: false,

    notRunning: function () {
        return !this.get('running');
    }.property('running'),

    startnummerEingegeben: function () {
        var ok =  this.get('startnummer').length >= 3;
        this.set('ready', ok);
        return ok;
    }.property('startnummer'),

    notStartnummerEingegeben: function () {
        return !this.get('startnummerEingegeben');
    }.property('startnummerEingegeben'),

       lapButtonBackground: function() {
        if(this.get('lapButtonDisabled')) {
            return 'background-red';
        } else {
            return 'background-green';
        }
    }.property('lapButtonDisabled'),

    backDisabled: function() {
        return this.get('runde') !== 1;
    }.property('runde'),

    lapButtonDisabled: function () {
        if (!this.get('running') && !this.get('ready')) {
            return true;
        }
        if (!this.get('running') || this.get('ready')) {
            return true;
        }
        if (this.get('flaps').length === 0){
            return false;
        }
        var round0 = this.get('flaps')[0].laptime;
        var actRound = this.get('time');
        if (actRound < round0 * 0.7) {
            return true;
        }
        return false;
    }.property('running', 'flaps', 'time', 'ready'),

    startnummer: '',
    flaps: function () {
        this.set('lapschanged', false);
        var startnummer = this.get('startnummer');
        var token = this.get('token');
        return this.get('laps').filter(function (lap) {
            return lap.startnummer == startnummer && lap.token == token;
        });
    }.property('laps.length', 'startnummer', 'lapschanged'),
    actions: {
        start: function () {
//            var audio = new Audio('assets/click.wav');
//            audio.play();
            this.set('running', true);
            this.set('inputDisabled', true);
            this.set('ready', false);
            this.set('token', new Date().getTime());
            Ember.run.later(this, function () {
                this.send('loop');
            }, 100);
        },
        loop: function () {
            if (this.get('running')) {
                var time = Math.round(this.get('time')*10 + 1);
                time = time / 10;
                this.set('time', time);
                Ember.run.later(this, function () {
                    this.send('loop');
                }, 100);
            }
        },
        stop: function () {
            this.set('running', false);
            this.set('ready', false);
        },
        new: function () {
            this.set('runde', 0);
            this.set('time', 0);
            this.set('running', false);
            this.set('startnummer', '');
            this.set('token', '');
            this.set('laps', []);
            this.set('ready', false);
            this.set('inputDisabled', false);
        },
        back: function () {
            var runde = this.get('runde');
            if (runde !== 1) return;
            var flaps = this.get('flaps');
            var laps = this.get('laps');
            var wertung = flaps[0];
            var index = laps.indexOf(wertung);
            Ember.run.once(this, function () {
                this.sendAction('delete', wertung);
            });
            wertung.laptime = Math.round((wertung.laptime + this.get('time')) * 10) / 10;
            this.set('time' ,0);
            this.set('lapschanged', true);
            Ember.run.once(this, function () {
                this.sendAction('saveNewRecord', wertung);
            });
            this.set('ready', false);
        },
        lap: function () {
//            var audio = new Audio('assets/click.wav');
//            audio.play();
            var date = new Date().getTime();
            var newLap =
            {
                'startnummer': this.get('startnummer'),
                'token': this.get('token'),
                'laptime': this.get('time'),
                'date': date
            };
            this.get('laps').pushObject(newLap);
            var newLapStr = JSON.stringify(newLap);
            this.sendAction('saveNewRecord', newLap);
            if (this.get('runde') === App.get('NUMBER_LAPS')) {
                this.set('ready', true);
                this.set('running', false);
                return;
            }

            this.set('runde', this.get('runde') + 1);
            this.set('time', 0);
        }
    }
});



