i18n.t('myNamespace|firstKey>secondKey>with custom separators', {
    keySeparator: '>',
    nsSeparator: '|',
});
i18n.t('myNamespace:firstKey.secondKey.with custom separators 2', {
    keySeparator: '.',
    nsSeparator: ':',
});

i18n.t('myNamespace|firstKey>secondKey>without custom separators');
i18n.t('myNamespace:firstKey.secondKey.without custom separators 2');
