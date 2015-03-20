var i18n = require('i18next');

i18n._ = require('i18next-text')._;

var msg = [
    i18n._('Loading...'),
    i18n._('This value does not exist.'),
    i18n._('YouTube has more than __count__ billion users.', {count: 1})
].join('\n');

console.log(msg);
