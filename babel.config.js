module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'babel-plugin-transform-import-meta',
      ['babel-plugin-transform-define', {
        'import.meta.env.MODE': '"production"',
        'import.meta.env': '{"MODE": "production"}'
      }]
    ],
  };
};
