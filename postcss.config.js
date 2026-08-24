export default {
  plugins: {
    autoprefixer: {
      overrideBrowserslist: [
        'last 2 Chrome versions',
        'last 2 Safari versions',
        'last 2 iOS versions',
        'last 2 Firefox versions',
        'last 2 Edge versions',
        'Chrome >= 80',
        'Safari >= 13',
        'iOS >= 13',
      ],
    },
  },
};
