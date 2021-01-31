# unix-domain-socket-ssh-forwarder

UNIX Domain socket local forwarding through SSH with public Key authentication

## Usage

### Forwarder main script

```js
const { UnixDomainSocketSSHForwarder } = require('unix-domain-socket-ssh-forwarder')

const privateKey = `\
-----BEGIN OPENSSH PRIVATE KEY-----
xxxxxxxxxxxxxxxxxx
-----END OPENSSH PRIVATE KEY-----`

const UDSSSHForwarder = new UnixDomainSocketSSHForwarder({
  username: 'dbforwarder',
  privateKey,
  host: '192.168.111.111',
  localSocketPath: '/tmp/remote.mysqld.sock',
  remoteSocketPath: '/var/run/mysqld/mysqld.sock',
  log: (msg) => { console.info(msg) }
})

UDSSSHForwarder.start()
.then(() => {
  console.info('ssh forwarding started')
})
.catch(err => {
  console.error(err)
})

process.on('SIGINT', async () => {
  UDSSSHForwarder.stop()
  .then(() => {
    console.info('ssh forwarding stopped')
  })
})
```

### Execute main script on a shell

```
$ node main.js
ssh forwarding started
new client connected
client disconnected
^Cssh forwarding stopped
```

### Run client command on another shell

```
$ mysql --socket=/tmp/remote.mysqld.sock -u mysqluser -p
Enter password: 
Welcome to the MySQL monitor.  Commands end with ; or \g.

mysql> Bye
```
