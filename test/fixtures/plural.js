i18next.t('key', {count: 0}); // output: 'items'
i18next.t('key', {count: 1}); // output: 'item'
i18next.t('key', {count: 5}); // output: 'items'
i18next.t('key', {count: 100}); // output: 'items'
i18next.t('keyWithCount', {count: 0}); // output: '0 items'
i18next.t('keyWithCount', {count: 1}); // output: '1 item'
i18next.t('keyWithCount', {count: 5}); // output: '5 items'
i18next.t('keyWithCount', {count: 100}); // output: '100 items'

// Variables
const one = 1;
const count = 2;

i18next.t('keyWithVariable', { count: one }); // output: 'item'
i18next.t('keyWithVariable', { count }); // output: 'items'
