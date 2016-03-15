var i18n = require('i18next');

const _t = function(value) {
    return i18n.t(value);
};

var msg = [
    _t('Loading...'),
    _t('This value does not exist.'),
    _t('YouTube has more than __count__ billion users.', {count: 1})
].join('\n');

console.log(msg);
