i18next.t('product.milk', { defaultValue: 'Milk' }); // output: 'Milk'
i18next.t('product.bread', 'Bread'); // output: 'Bread'
i18next.t('product.boiledEgg', 'Boiled Egg'); // output: 'Boiled Egg'
i18next.t(
    'product.cheese',
    'Cheese'
); // output: 'Cheese'
i18next.t('product.potato', '{{color}} potato', { color: 'white' }); // output: '{{color}} potato'
i18next.t(
    'product.carrot',
    '{{size}} carrot',
    { size: 'big' }
); // output: '{{size}} potato'
