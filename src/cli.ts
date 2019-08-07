import yargs from 'yargs'
import gen, { Options, LibraryUsage } from './'

export default function main(): void {
  const args = yargs
    .strict()
    .usage(`$0 name [options]`, `Create a test directory`)
    .option(`name`, {
      type: `string`,
      description: `The directory name`
    })
    .option(`context`, {
      type: `string`,
      description: `The directory context`,
      alias: `c`
    })
    .option(`output`, {
      type: `string`,
      description: `Project build dir, used for link library, should follow outDir if use typescript`
    })
    .option(`use`, {
      type: `string`,
      description: `How to link library, use npm link or npm install`,
      choices: [LibraryUsage.Link, LibraryUsage.Install]
    })
    .option(`ts`, {
      type: `boolean`,
      description: `Mark test project as a typescript project`
    })
    .option(`exporter`, {
      type: `string`,
      description: `Generated test script exporter name, default to "lib"`
    })
    .option(`install`, {
      type: `boolean`,
      description: `Install dependency after dir and file created`
    })
    .help()
    .alias(`help`, `h`)
    .argv

  gen(args as Partial<Options>)
}
