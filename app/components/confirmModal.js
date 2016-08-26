App.ConfirmModalComponent = Ember.Component.extend({
    actions:{
        cancel: function(){
            $(".modal-backdrop").css('display', 'none');
            this.sendAction('cancel');
        },
        ok: function(){
            $(".modal-backdrop").css('display', 'none');
            this.sendAction('ok');
        }
    },
    becomeFocused: function() {

    }.on('didInsertElement')

});

