module.exports = (api) => {
  const { env } = { ...api };
  const plugins = [
  ];

  if (typeof env === 'function' && env('test')) {
    // Enable async/await for jest
    plugins.push('@babel/plugin-transform-runtime');
  }

  return {
    extends: '@trendmicro/babel-config',
    presets: [
      [
        '@babel/preset-env',
        {
          useBuiltIns: 'entry',
          corejs: 3,
        }
      ],
      [
        '@babel/preset-react',
        {},
      ],
    ],
    plugins,
  };
};
