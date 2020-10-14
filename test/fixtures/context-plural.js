i18next.t('friend', { context: 'male', count: 1 }); // output: 'A boyfriend'
i18next.t('friend', { context: 'female', count: 1 }); // output: 'A girlfriend'
i18next.t('friend', { context: 'male', count: 100 }); // output: '100 boyfriends'
i18next.t('friend', { context: 'female', count: 100 }); // output: '100 girlfriends'

i18next.t('friendWithDefaultValue', '{{count}} boyfriend', { context: 'male', count: 100 }); // output: '100 boyfriends'
i18next.t('friendWithDefaultValue', '{{count}} girlfriend', { context: 'female', count: 100 }); // output: '100 girlfriends'

i18next.t('friendDynamic', { context: dynamicVal, count: 1, contextList: 'gender' });
i18next.t('friendDynamic', { context: dynamicVal, count: 100, contextList: 'gender' });
