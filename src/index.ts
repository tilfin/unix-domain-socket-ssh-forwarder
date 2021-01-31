import { Client } from 'ssh2'
import net from 'net'
import fs from 'fs'

export interface UnixDomainSocketSSHForwarderOptions {
  username: string
  privateKey: string | Buffer
  host: string
  port?: number
  localSocketPath: string
  remoteSocketPath: string
  log?: (msg: string) => void
}

export class UnixDomainSocketSSHForwarder {
  private server: net.Server | null = null
  private sockets: Set<net.Socket> = new Set()
  private log: (msg: string) => void

  constructor(private options: UnixDomainSocketSSHForwarderOptions) {
    this.log = options.log || (msg => { console.log(msg) })
  }

  async start(): Promise<void> {
    if (this.server) throw new Error('Already started')

    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        this.newConnect()
        .then(client => {
          client.openssh_forwardOutStreamLocal(this.options.remoteSocketPath, (err, channel) => {
            if (err) {
              this.log(err.message)
              return
            }
            socket.pipe(channel)
            channel.pipe(socket)

            socket.on('close', () => {
              client.removeAllListeners()
              client.end()
              this.sockets.delete(socket)
              this.log('client disconnected')
            })

            this.sockets.add(socket)
          })
          this.log('new client connected')
        })
      }).listen(this.options.localSocketPath, () => {
        resolve()
      })
    })
  }

  stop(): Promise<void> {
    if (!this.server) return Promise.resolve()

    Array.from(this.sockets.values()).forEach(socket => {
      socket.destroy()
    })

    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close(err => {
          if (err) reject(err)
          else {
            fs.unlink(this.options.localSocketPath, () => {
              resolve()
            })
          }
        })
      }
      this.server = null
      resolve()
    })
  }

  private async newConnect(): Promise<Client> {
    const client = new Client()
    const options = {
      host: this.options.host,
      port: this.options.port || 22,
      username: this.options.username,
      privateKey: this.options.privateKey
    }

    return new Promise<Client>((resolve, reject) => {
      client.on('ready', () => {
        resolve(client)
      })
      client.on('error', reject)

      try {
        client.connect(options)
      } catch (err) {
        reject(err)
      }
    })
  }
}
