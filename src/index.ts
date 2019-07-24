import * as fs from 'fs'
import * as path from 'path'
import readPkgUp from 'read-pkg-up'
import { exec } from 'child_process'
import { promisify } from 'util'

export enum LibraryUsage { Link = 'link', Install = 'install' }

export interface Options {
  name: string
  context: string
  output: string
  use: LibraryUsage
  ts: boolean
  exporter: string
  install: boolean
}

const DEFAULT_OPTIONS: Omit<Options, 'name' | 'ts'> = {
  context: `.`,
  output: `.`,
  use: LibraryUsage.Install,
  exporter: `lib`,
  install: true
}

function makePackageJson(name: string, lib: { dependencies: { [key: string]: string } }, ext: string, ts: boolean): string {
  const base = {
    private: true,
    name,
    description: `test for ${name}`,
    main: `./index.${ext}`
  }

  const tsDeps = !ts ? {
    script: {
      start: `node index.js`
    }
  } : {
    script: {
      start: `ts-node index.ts`
    },
    devDependencies: {
      "ts-node": `latest`,
      "typescript": `latest`
    }
  }

  return JSON.stringify({ ...base, ...tsDeps, ...lib }, null, `\t`)
}

function makeTestScript(name: string, exporter: string, ts: boolean): string {
  if(ts) return `\
import ${exporter} from '${name}'

console.log(${exporter})
`
  else return `\
const ${exporter} = require('${name}')

console.log(${exporter})
`
}

function makeLibraryDependency(use: LibraryUsage, libName: string, libPath: string) {
  switch(use) {
    case LibraryUsage.Link: return { dependencies: { [libName]: `file:${libPath}` } }
    case LibraryUsage.Install: return { dependencies: { [libName]: `latest` } }
    default: throw new TypeError(`Unknown LibraryUsage "${use}"`)
  }
}

function tsConfigExists(root: string): boolean {
  return fs.readdirSync(root).some(p => /(t|j)sconfig/.test(p))
}

function resolveRelativePath(libPath: string, root: string, output: string): string {
  const outPath: string = path.resolve(root, output)
  const ret: string = path.relative(libPath, outPath)
  if(`` === ret) return `./`
  const fmt = ret.replace(/\\/g, `\/`)
  return fmt.endsWith(`.`) ? fmt + `/` : fmt
}

export default async function main(options: Partial<Options> = {}) {
  const { 
    name, 
    context,
    output,
    use, 
    ts, 
    exporter, 
    install 
  } = { ...DEFAULT_OPTIONS, ...options }

  if(undefined === name) throw makeNameRequiredError()
  const pkg = await readPkgUp({ normalize: true })
  if(undefined === pkg) throw makeConfigFileNotFoundError()
  const { name: pkgName } = pkg.package
  const dirName: string = `${pkgName}-${name}`
  const dir = path.resolve(context, name)
  if(fs.existsSync(dir)) throw makeTargetDirectoryExistsError(dir)
  fs.mkdirSync(dir)

  const root: string = path.dirname(pkg.path)
  const tsUsage: boolean = undefined === ts ? tsConfigExists(root) : ts

  const script: string = makeTestScript(pkgName, exporter, tsUsage)
  const scriptExt: string = tsUsage ? `ts` : `js`
  fs.writeFileSync(path.resolve(dir, `index.${scriptExt}`), script, `utf-8`)

  const relativePath: string = resolveRelativePath(dir, root, output)
  const libDeps = makeLibraryDependency(use, pkgName, relativePath)
  const filePackageJson = makePackageJson(dirName, libDeps, scriptExt, tsUsage)
  fs.writeFileSync(path.resolve(dir, `package.json`), filePackageJson, `utf-8`)

  if(install) {
    const execp = promisify(exec)
    const { stdout, stderr } = await execp(`npm install`, { cwd: dir })
    console.log(stdout)
    console.log(stderr)
  }
}

function makeConfigFileNotFoundError(): Error {
  return new Error(`package.json not found`)
}

function makeNameRequiredError(): Error {
  return new Error(`The option "name" was required`)
}

function makeTargetDirectoryExistsError(dir: string): Error {
  return new Error(`Target directory already exists "${dir}"`)
}
