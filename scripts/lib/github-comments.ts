import {execSync} from 'node:child_process'

export interface CommentOptions {
  repo: string
  prNumber: string
  identifier: string
}

export interface Comment {
  id: number
  body: string
}

export class GitHubComments {
  private readonly repo: string
  private readonly prNumber: string
  private readonly identifier: string

  constructor(options: CommentOptions) {
    this.repo = options.repo
    this.prNumber = options.prNumber
    this.identifier = options.identifier
  }

  async findExistingComment(): Promise<Comment | null> {
    if (!this.prNumber) {
      return null
    }

    try {
      const output = execSync(
        `gh api repos/${this.repo}/issues/${this.prNumber}/comments --paginate --jq '.[] | {id, body}'`,
        {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      )

      const comments = output
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line) as Comment)

      return comments.find(comment => comment.body.includes(this.identifier)) ?? null
    } catch (error) {
      console.error('Error finding existing comment:', error)
      return null
    }
  }

  async upsertComment(body: string): Promise<void> {
    if (!this.prNumber) {
      console.warn('No PR number provided, skipping comment posting')
      return
    }

    const commentBody = `${this.identifier}\n${body}`
    const existing = await this.findExistingComment()

    try {
      if (existing) {
        console.info(`Updating existing comment ${existing.id}`)
        execSync(
          `gh api repos/${this.repo}/issues/comments/${existing.id} -X PATCH -f body="${this.escapeBody(commentBody)}"`,
          {
            encoding: 'utf-8',
            stdio: 'inherit',
          },
        )
      } else {
        console.info('Creating new comment')
        execSync(
          `gh api repos/${this.repo}/issues/${this.prNumber}/comments -f body="${this.escapeBody(commentBody)}"`,
          {
            encoding: 'utf-8',
            stdio: 'inherit',
          },
        )
      }
    } catch (error) {
      console.error('Error posting comment:', error)
      throw error
    }
  }

  private escapeBody(body: string): string {
    return body.replaceAll('"', String.raw`\"`).replaceAll('\n', String.raw`\n`)
  }
}
