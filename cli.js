#!/usr/local/bin/node
const YAML = require('yamljs');
const fs   = require('fs');
const path = require('path');
const execFile = require('child_process').execFile;
const replace = require('replace-in-file');
const argv = require('minimist')(process.argv.slice(2), {
  boolean: ['help', 'automate'],
  string: ['command', 'generate-keypair'],
  alias: {
    command: ['cmd', 'c'],
    'generate-keypair': ['generate', 'g'],
    automate: ['auto','a'],
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
  const basename = answerFile.replace(/^.*\//, '');
  if (argv.auto) {
    execFile('ssh-keygen', [
      '-t', 'rsa',
      '-b', '2048',
      '-f', privateKeyPath,
      '-N', '',
      '-C', basename + '@mock-ssh-responses',
    ], cb);
  } else {
    execFile('ssh-keygen', [
      '-t', 'rsa',
      '-b', '2048',
      '-f', privateKeyPath,
      '-C', basename + '@mock-ssh-responses',
    ], cb);
  }
}

if (argv.help) {
  console.log('TODO: help');
  process.exit(0);
}

let answerFile = argv._[0];
if (!answerFile) {
  fatal('First argument should be the path to an answers file');
}
let answers;
try {
  answers = YAML.load(answerFile);
} catch (err) {
  fatal('Unable to parse answers file at %s', answerFile);
}

if (!Array.isArray(answers)) {
  fatal('Answers are not in an array');
}

if (argv.generate) {
  // File paths
  const resolvedAnswerFile = path.resolve(answerFile);
  const resolvedGeneratePath = path.resolve(argv.generate);
  const authorizedKeysFile = resolvedGeneratePath.replace(/mocked-localhost/, 'authorized_keys');
  const configFile = resolvedGeneratePath.replace(/mocked-localhost/, 'config');
  const hostEntry = [ '',
          'Host mock-' + answerFile.replace(/^.*\//, ''),
          '    HostName localhost',
          '    IdentityFile ' + resolvedGeneratePath
        ].join("\n")
  
  if (!fs.existsSync(path)) {
    // Do something
  }

  // Remove old private key
  execFile('rm', ['-f', resolvedGeneratePath], (error, stdout, stderr) => { if (error) { throw error; } });

  return generate(answerFile, argv.generate, function (error) {
    if (error) {
      fatal('Failed to generate key at %s', argv.generate, error);
    }
    fs.readFile(argv.generate + '.pub', 'utf-8', function (error, contents) {
      // Generate new authorized key
      const authorizedKey = 'command="' + process.argv[1] + ' ' + resolvedAnswerFile + '",no-port-forwarding,no-X11-forwarding,no-pty' + ' ' + contents.replace(/\n$/, '');
      
      // Automate flag is present
      if (argv.auto) {
        if (fs.existsSync(authorizedKeysFile)) {
          // Replace old key with new key if it exists. Otherwise append new key.
          const options = {
            files: authorizedKeysFile,
            replace: /command.*mock-ssh-responses/g,
            with: authorizedKey
          };
          replace(options, (error, changedFile) => {
            if (error) { fatal('Error occurred while replacing key: ', error); }

            // Append new key if old key did not exist and was not replaced
            if (changedFile == '') {
              // If authorized_keys file exists
              
              fs.appendFile(authorizedKeysFile, authorizedKey, function (error) {
                if (error) { fatal('Error occurred while appending key to authorized_keys file: ', error); }
              });
            }
          });
        } else {
          // Create authorized_keys file
          fs.openSync(authorizedKeysFile, 'w', function (error) {
            if (error) { fatal('Error occurred while creating authorized_keys file: ', error); }
          });
          // Change permissions
          fs.chmodSync(authorizedKeysFile, '600');
          // Append to file
          fs.appendFile(authorizedKeysFile, authorizedKey, function (error) {
            if (error) { fatal('Error occurred while appending key to authorized_keys file: ', error); }
          });
        }
        if (fs.existsSync(configFile)) {
          // If host entry is not present append to config fle
          fs.readFile(configFile, function (err, data) {
            if (err) throw err;
            if(data.indexOf(resolvedGeneratePath) < 0){
              fs.appendFile(configFile, hostEntry, function (error) {
                if (error) { fatal('Error occurred while appending host entry to config file: ', error); }
              });
            }
          });
        } else {
          // Create authorized_keys file
          fs.openSync(configFile, 'w', function (error) {
            if (error) { fatal('Error occurred while creating config file: ', error); }
          });
          // Change permissions
          fs.chmodSync(configFile, '644');
          // Append to file
          fs.appendFile(configFile, hostEntry, function (error) {
            if (error) { fatal('Error occurred while appending host entry to new config file: ', error); }
          });
        }

      // Automate flag is not present
      } else {
        // Print manual steps
        console.log('Place the following line in your authorized_keys file:');
        console.log(authorizedKey);
        console.log();
        console.log('Place the following lines in your ~/.ssh/config:');
        console.log(hostEntry);
        console.log();
        console.log('Or use the --auto flag to apply the changes automatically');
      }
    });
  });
}

const cmd = argv.command || process.env['SSH_ORIGINAL_COMMAND'];
debug('Command to match is', cmd);
if (!cmd) {
  fatal('Command should be provided either as an argument or via env');
}

const filtered = answers.filter(function (answer) {
  debug('Trying to match against', answer.cmd);
  return answer.cmd === cmd;
});

if (!filtered.length) {
  fatal('No matched answers');
}
const matched = filtered[0];
if (matched.stdout) console.log(matched.stdout.replace(/\n$/, ''));
if (matched.stderr) console.error(matched.stderr.replace(/\n$/, ''));
process.exit(matched.code || 0);
