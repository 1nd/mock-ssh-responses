# `mock-ssh-responses`

Utility to respond with custom output and exit codes based on a given answers file.

## Example

Write an answers file in yaml `answers.yml`

```yaml
- cmd: id nobody
  stdout: uid=99(nobody) gid=99(nobody) groups=99(nobody)
  code: 0
- cmd: ls doesnotexist
  stderr: ls: cannot access 'doesnotexist': No such file or directory
  code: 2
```

Generate a keypair based on this answers file.

```bash
./cli.js -g ~/.ssh/mocked-localhost answers.yml
```

Follow the instructions onscreen to add the configuration to your ssh config files.

Then run your mocks:
```
$ ssh mock-answers.yml id nobody
uid=99(nobody) gid=99(nobody) groups=99(nobody)
$ ssh mock-answers.yml ls doesnotexist
ls: cannot access 'doesnotexist': No such file or directory
$ echo $?
2
```