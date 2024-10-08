import { spawn, type ChildProcess } from 'child_process'
import { exec } from 'child-process-promise'
import { merge } from 'lodash'
import { statSync, readdirSync, mkdirSync, existsSync, createWriteStream, realpathSync } from 'fs'
import path, { join, dirname } from 'path'
import { ForkPromise } from '@shared/ForkPromise'
import crypto from 'crypto'
import axios from 'axios'
import { readdir } from 'fs-extra'
import type { AppHost } from '@shared/app'
import { fixEnv } from '@shared/utils'
export const ProcessSendSuccess = (key: string, data: any, on?: boolean) => {
  process?.send?.({
    on,
    key,
    info: {
      code: 0,
      data
    }
  })
}

export const ProcessSendError = (key: string, msg: any, on?: boolean) => {
  process?.send?.({
    on,
    key,
    info: {
      code: 1,
      msg
    }
  })
}

export const ProcessSendLog = (key: string, msg: any, on?: boolean) => {
  process?.send?.({
    on,
    key,
    info: {
      code: 200,
      msg
    }
  })
}

export function uuid(length = 32) {
  const num = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
  let str = ''
  for (let i = 0; i < length; i++) {
    str += num.charAt(Math.floor(Math.random() * num.length))
  }
  return str
}

export function waitTime(time: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, time)
  })
}

export function execPromise(
  cammand: string,
  opt?: { [k: string]: any }
): ForkPromise<{
  stdout: string
  stderr: string
}> {
  return new ForkPromise(async (resolve, reject) => {
    try {
      const env = await fixEnv()
      const res = await exec(
        cammand,
        merge(
          {
            env
          },
          opt
        )
      )
      resolve(res)
    } catch (e) {
      reject(e)
    }
  })
}

export function spawnPromise(
  cammand: string,
  params: Array<any>,
  opt?: { [k: string]: any }
): ForkPromise<any> {
  return new ForkPromise(async (resolve, reject, on) => {
    const stdout: Array<Buffer> = []
    const stderr: Array<Buffer> = []
    const env = await fixEnv()
    const child = spawn(
      cammand,
      params,
      merge(
        {
          env
        },
        opt
      )
    )
    const stdinFn = (txt: string) => {
      child?.stdin?.write(`${txt}\n`)
    }
    let exit = false
    const onEnd = (code: number | null) => {
      if (exit) return
      exit = true
      if (!code) {
        resolve(Buffer.concat(stdout).toString().trim())
      } else {
        reject(new Error(Buffer.concat(stderr).toString().trim()))
      }
    }
    child?.stdout?.on('data', (data) => {
      stdout.push(data)
      on(data.toString(), stdinFn)
    })
    child?.stderr?.on('data', (err) => {
      stderr.push(err)
      on(err.toString(), stdinFn)
    })
    child.on('exit', onEnd)
    child.on('close', onEnd)
  })
}

export async function spawnPromiseMore(
  cammand: string,
  params: Array<any>,
  opt?: { [k: string]: any }
): Promise<{
  promise: ForkPromise<any>
  spawn: ChildProcess
}> {
  const stdout: Array<Buffer> = []
  const stderr: Array<Buffer> = []
  const env = await fixEnv()
  const child = spawn(
    cammand,
    params,
    merge(
      {
        env
      },
      opt
    )
  )
  const stdinFn = (txt: string) => {
    child?.stdin?.write(`${txt}\n`)
  }
  const promise = new ForkPromise((resolve, reject, on) => {
    let exit = false
    const onEnd = (code: number | null) => {
      if (exit) return
      exit = true
      if (!code) {
        resolve(Buffer.concat(stdout).toString().trim())
      } else {
        reject(new Error(Buffer.concat(stderr).toString().trim()))
      }
    }
    child.stdout.on('data', (data) => {
      stdout.push(data)
      on(data.toString(), stdinFn)
    })
    child.stderr.on('data', (err) => {
      stderr.push(err)
      on(err.toString(), stdinFn)
    })
    child.on('exit', onEnd)
    child.on('close', onEnd)
  })
  return {
    promise,
    spawn: child
  }
}

export function createFolder(fp: string) {
  fp = fp.replace(/\\/g, '/')
  if (existsSync(fp)) {
    return true
  }
  const arr = fp.split('/')
  let dir = '/'
  for (const p of arr) {
    dir = join(dir, p)
    if (!existsSync(dir)) {
      mkdirSync(dir)
    }
  }
  return existsSync(fp)
}

export function md5(str: string) {
  const md5 = crypto.createHash('md5')
  return md5.update(str).digest('hex')
}

export function getAllFile(fp: string, fullpath = true, basePath: Array<string> = []) {
  let arr: Array<string> = []
  if (!existsSync(fp)) {
    return arr
  }
  const state = statSync(fp)
  if (state.isFile()) {
    return [fp]
  }
  const files = readdirSync(fp)
  files.forEach(function (item) {
    const base = [...basePath]
    base.push(item)
    const fPath = join(fp, item)
    if (existsSync(fPath)) {
      const stat = statSync(fPath)
      if (stat.isDirectory()) {
        const sub = getAllFile(fPath, fullpath, base)
        arr = arr.concat(sub)
      }
      if (stat.isFile()) {
        arr.push(fullpath ? fPath : base.join('/'))
      }
    }
  })
  return arr
}

export function downFile(url: string, savepath: string) {
  return new ForkPromise((resolve, reject, on) => {
    const proxyUrl =
      Object.values(global?.Server?.Proxy ?? {})?.find((s: string) => s.includes('://')) ?? ''
    let proxy: any = {}
    if (proxyUrl) {
      try {
        const u = new URL(proxyUrl)
        proxy.protocol = u.protocol.replace(':', '')
        proxy.host = u.hostname
        proxy.port = u.port
      } catch (e) {
        proxy = undefined
      }
    } else {
      proxy = undefined
    }
    axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      proxy: proxy,
      onDownloadProgress: (progress) => {
        if (progress.total) {
          const percent = Math.round((progress.loaded * 100.0) / progress.total)
          on(percent)
        }
      }
    })
      .then(function (response) {
        const base = dirname(savepath)
        createFolder(base)
        const stream = createWriteStream(savepath)
        response.data.pipe(stream)
        stream.on('error', (err) => {
          reject(err)
        })
        stream.on('finish', () => {
          resolve(true)
        })
      })
      .catch((err) => {
        reject(err)
      })
  })
}

export function getSubDir(fp: string, fullpath = true) {
  const arr: Array<string> = []
  if (!existsSync(fp)) {
    return arr
  }
  const stat = statSync(fp)
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    try {
      const files = readdirSync(fp)
      files.forEach(function (item) {
        const fPath = join(fp, item)
        if (existsSync(fPath)) {
          const stat = statSync(fPath)
          if (stat.isDirectory() && !stat.isSymbolicLink()) {
            arr.push(fullpath ? fPath : item)
          }
        }
      })
    } catch (e) {}
  }
  return arr
}

export const getAllFileAsync = async (
  dirPath: string,
  fullpath = true,
  basePath: Array<string> = []
): Promise<string[]> => {
  if (!existsSync(dirPath)) {
    return []
  }
  const list: Array<string> = []
  const files = await readdir(dirPath, { withFileTypes: true })
  for (const file of files) {
    const arr = [...basePath]
    arr.push(file.name)
    const childPath = path.join(dirPath, file.name)
    if (file.isDirectory()) {
      const sub = await getAllFileAsync(childPath, fullpath, arr)
      list.push(...sub)
    } else if (file.isFile()) {
      const name = fullpath ? childPath : arr.join('/')
      list.push(name)
    }
  }
  return list
}

export const getSubDirAsync = async (dirPath: string, fullpath = true): Promise<string[]> => {
  if (!existsSync(dirPath)) {
    return []
  }
  const list: Array<string> = []
  const files = await readdir(dirPath, { withFileTypes: true })
  for (const file of files) {
    const childPath = path.join(dirPath, file.name)
    if (!existsSync(childPath)) {
      continue
    }
    if (
      file.isDirectory() ||
      (file.isSymbolicLink() && statSync(realpathSync(childPath)).isDirectory())
    ) {
      const name = fullpath ? childPath : file.name
      list.push(name)
    }
  }
  return list
}

export const hostAlias = (item: AppHost) => {
  const alias = item.alias
    ? item.alias.split('\n').filter((n) => {
        return n && n.length > 0
      })
    : []
  const arr = Array.from(new Set(alias)).sort()
  arr.unshift(item.name)
  return arr
}

export const systemProxyGet = async () => {
  const proxy: any = {}
  const services = ['Wi-Fi', 'Ethernet']
  try {
    for (const service of services) {
      let res = await execPromise(`networksetup -getwebproxy ${service}`)
      let result = res?.stdout?.match(
        /(?:Enabled:\s)(\w+)\n(?:Server:\s)([^\n]+)\n(?:Port:\s)(\d+)/
      )
      if (result) {
        const [_, enabled, server, port] = result
        if (enabled === 'Yes') {
          proxy['http_proxy'] = `http://${server}:${port}`
        }
      }

      res = await execPromise(`networksetup -getsecurewebproxy ${service}`)
      result = res?.stdout?.match(/(?:Enabled:\s)(\w+)\n(?:Server:\s)([^\n]+)\n(?:Port:\s)(\d+)/)
      if (result) {
        const [_, enabled, server, port] = result
        if (enabled === 'Yes') {
          proxy['https_proxy'] = `http://${server}:${port}`
        }
      }

      res = await execPromise(`networksetup -getsocksfirewallproxy ${service}`)
      result = res?.stdout?.match(/(?:Enabled:\s)(\w+)\n(?:Server:\s)([^\n]+)\n(?:Port:\s)(\d+)/)
      if (result) {
        const [_, enabled, server, port] = result
        if (enabled === 'Yes') {
          proxy['all_proxy'] = `http://${server}:${port}`
        }
      }
    }
  } catch (e) {}
  console.log('systemProxyGet: ', proxy)
  return proxy
}
