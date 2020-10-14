i18next.t('friend', {context: 'male'}); // output: 'A boyfriend'
i18next.t('friend', {context: 'female'}); // output: 'A girlfriend'
i18next.t('friendDynamic', {context: dynamicVal, contextList: 'gender'});
