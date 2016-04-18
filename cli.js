#!/usr/bin/env node
var YAML = require('yamljs'),
    fs   = require('fs'),
    path = require('path');
var argv = require('minimist')(process.argv.slice(2), {
  boolean: ['help'],
  string: ['command', 'generate-keypair'],
  alias: {
    command: ['cmd', 'c'],
    'generate-keypair': ['generate', 'g'],
    help: 'h'
  }
});

function fatal () {
  console.error.apply(null, arguments);
  process.exit(255);
}

function debug () {
  if (process.env.DEBUG) {
    console.error.apply(null, ['DEBUG'].concat(Array.prototype.slice.call(arguments, 0)));
  }
}

function generate (answerFile, privateKeyPath, cb) {
  var basename = answerFile.replace(/^.*\//, '');
  require('child_process').execFile('ssh-keygen', [
    '-t', 'rsa',
    '-b', '2048',
    '-f', privateKeyPath,
    '-C', basename + '@mock-ssh-responses',
  ], cb);
}

if (argv.help) {
  console.log('TODO: help');
  process.exit(0);
}

var answerFile = argv._[0];
if (!answerFile) {
  fatal('First argument should be the path to an answers file');
}
var answers;
try {
  answers = YAML.load(answerFile);
} catch (err) {
  fatal('Unable to parse answers file at %s', answerFile);
}

if (!Array.isArray(answers)) {
  fatal('Answers are not in an array');
}

if (argv.generate) {
  return generate(answerFile, argv.generate, function (err) {
    if (err) {
      fatal('Failed to generate key at %s', argv.generate, err);
    }
    var resolvedAnswerFile = path.resolve(answerFile),
        resolvedGeneratePath = path.resolve(argv.generate);
    fs.readFile(argv.generate + '.pub', 'utf-8', function (err, contents) {
      console.log('Place the following line in your authorized_keys file:');
      console.log(
        'command="' + process.argv[1] + ' ' + resolvedAnswerFile +
          '",no-port-forwarding,no-X11-forwarding,no-pty',
        contents.replace(/\n$/, '')
      );
      console.log();
      console.log('Place the following lines in your ~/.ssh/config:');
      console.log([
        'Host mock-' + answerFile.replace(/^.*\//, ''),
        '    HostName localhost',
        '    IdentityFile ' + resolvedGeneratePath
      ].join("\n"));
      console.log();
      console.log('Or use the --auto flag to apply the changes automatically');
    });
  });
}

var cmd = argv.command || process.env['SSH_ORIGINAL_COMMAND'];
debug('Command to match is', cmd);
if (!cmd) {
  fatal('Command should be provided either as an argument or via env');
}

var filtered = answers.filter(function (answer) {
  debug('Trying to match against', answer.cmd);
  return answer.cmd === cmd;
});

if (!filtered.length) {
  fatal('No matched answers');
}
var matched = filtered[0];
if (matched.stdout) console.log(matched.stdout.replace(/\n$/, ''));
if (matched.stderr) console.error(matched.stderr.replace(/\n$/, ''));
process.exit(matched.code || 0);
