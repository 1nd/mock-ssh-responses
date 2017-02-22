# `mock-ssh-responses`

Utility to respond with custom output and exit codes based on a given answers file.

## Example Answers File

Write an answers file in yaml `answers.yml`

```yaml
- cmd: id nobody
  stdout: uid=99(nobody) gid=99(nobody) groups=99(nobody)
  code: 0
- cmd: ls doesnotexist
  stderr: ls: cannot access 'doesnotexist': No such file or directory
  code: 2
```



## Generate a keypair based on this answers file

### Manual
Generates key for for .ssh/authorized_keys file and host entry for .ssh/config file

```bash
./cli.js -g ~/.ssh/mocked-localhost answers.yml
```

Follow the instructions onscreen to add the configuration to your ssh config files.


### Automate Flag
Uses blank passphrase for ssh-keygen
Inserts keys into ~/.ssh/authorized_keys and host entry into ~/.ssh/config file

```bash
./cli.js -a -g ~/.ssh/mocked-localhost answers.yml
```



## Run command line mock:
```
$ ssh mock-answers.yml id nobody
uid=99(nobody) gid=99(nobody) groups=99(nobody)
$ ssh -i ~/.ssh/mocked-localhost localhost id nobody
uid=99(nobody) gid=99(nobody) groups=99(nobody)
$ ssh mock-answers.yml ls doesnotexist
ls: cannot access 'doesnotexist': No such file or directory
$ echo $?
2
```



## simple-ssh use case:
mockTest.js
```js
const host = 'localhost';
const user = process.env.USER;
const key = process.env.HOME + '/.ssh/mocked-localhost';
const cmd = "id nobody";

sshExecute.run(host, user, key, cmd, function(code, stdout, stderr) {
  if (code) {
    return callback(500, stderr);
  } else {
  callback(200, stdout);
});
```

sshExecute.js
```js
exports.run = function(host, user, key, command, callback) {
  const SSH = require('simple-ssh');
  const ssh = new SSH({
    host: host,
    user: user,
    key: key
  });

  ssh.exec(command, {
    exit: function(code, stdout, stderr) {
      callback(code, stdout, stderr);
    }
  }).start();
};
```