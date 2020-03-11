module.exports = {
    extends: '@trendmicro/babel-config',
    presets: [
        [
            '@babel/preset-env',
            {
                useBuiltIns: 'entry',
                corejs: 3,
            }
        ]
    ]
};
