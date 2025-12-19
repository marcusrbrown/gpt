import {appendFileSync} from 'node:fs'
import process from 'node:process'

export class JobSummary {
  private readonly summaryPath: string | undefined

  constructor() {
    this.summaryPath = process.env.GITHUB_STEP_SUMMARY
  }

  write(content: string): void {
    if (!this.summaryPath) {
      console.warn('GITHUB_STEP_SUMMARY not set, skipping job summary')
      return
    }

    try {
      appendFileSync(this.summaryPath, `${content}\n`, 'utf-8')
      console.info('Job summary written successfully')
    } catch (error) {
      console.error('Error writing job summary:', error)
      throw error
    }
  }

  writeHeading(text: string, level = 2): void {
    const heading = `${'#'.repeat(level)} ${text}`
    this.write(heading)
  }

  writeTable(headers: string[], rows: string[][]): void {
    const headerRow = `| ${headers.join(' | ')} |`
    const separator = `| ${headers.map(() => '---').join(' | ')} |`
    const dataRows = rows.map(row => `| ${row.join(' | ')} |`)

    this.write([headerRow, separator, ...dataRows].join('\n'))
  }

  writeParagraph(text: string): void {
    this.write(`\n${text}\n`)
  }
}
