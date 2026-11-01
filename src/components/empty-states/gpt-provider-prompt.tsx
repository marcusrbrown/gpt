import {Link} from 'react-router-dom'

export function GPTProviderPrompt({providerName}: {providerName: string}) {
  return (
    <div className="border-t border-border-default p-4 text-sm text-content-secondary text-center">
      <p>{providerName} isn't set up for this GPT. Add its API key in Settings.</p>
      <Link className="text-primary-600 underline" to="/settings">
        Settings
      </Link>
    </div>
  )
}
