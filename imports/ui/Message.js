import * as lib from '../api/lib';

const pre = 'Message_';
const get = function(n) { return Session.get(pre + n )};
const set = function(n,v) {  Session.set(pre + n,v) };
const setd = function(n,v) {  Session.setDefault(pre + n,v) };

Template.Message.created = function() {
};

Template.Message.helpers({
  title: function(){
    const options = get('options');
    if ( options ) {
      return options.title;
    }
    return '';
  },
  list: function(){
    const options = get('options');
    if ( options ) {
      return options.messages;
    }
    return [];
  },
  buttons: function(){
    const options = get('options');
    if ( options ) {
      let html = [];
      for ( let i=0; i < options.buttons.length; i++ ) {
        const b = options.buttons[i];
        let style = '';
        if ( b.style ) style = sprintf('style="%s"',b.style);
        html.push( sprintf('<div class="%s msg_submit" data="%s" %s>%s</div>',b.cls,b.value,style,b.label));
      }
      return html.join('\n');
    }
    return '';
  },
});

Template.Message.events({
  'click .msg_submit': function(e){
    const response = $(e.currentTarget).attr('data');

    const options = get('options');
    // options.setVariables = [ { name: 'proofs_showMessage', value: false } ];
    // options.title = 'Verify Proof Sent';
    // options.messages = list;
    // options.setResponse = 'proofs_popupResponse';
    // options.buttons = [];
    // options.buttons.push( { label: 'Proof Sent', value: 1, cls: 'ep_button' });
    // options.buttons.push( { label: 'Cancel', value: 0, cls: 'ep_button3' });

    for ( let i=0; i < options.setVariables.length; i++ ) {
      const o = options.setVariables[i];
      Session.set(o.name,o.value);
    }
    Session.set(options.setResponse,response);
  },
});
