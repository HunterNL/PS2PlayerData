Package.describe({
  name: 'hunternl:ps2playerdata',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: 'Just trying out the package system',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0.5');
  api.use("stevezhu:lodash");
  api.use("http");
  api.use("mongo");
  api.use("check");

  api.export("PS2Data");
  api.addFiles('server.js',"server");
  api.addFiles('client.js',"client");
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('hunternl:ps2playerdata');
  api.addFiles('ps2playerdata-tests.js');
});
