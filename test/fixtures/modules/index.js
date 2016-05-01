var i18n = require('i18next');

const _t = function(value) {
    return i18n.t(value);
};

var msg = [
    _t('Loading...'),
    _t('This value does not exist.'),
    _t('YouTube has more than {{count}} billion users.', {count: 1}),
    _t('You have {{count}} messages.', {
        count: 10
    });
].join('\n');

console.log(msg);
