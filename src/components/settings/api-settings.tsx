import {useState} from 'react';
import {Input, Button} from '@heroui/react';
import {useOpenAI} from '../../contexts/openai-provider';

export function APISettings() {
  const {apiKey, setApiKey, clearApiKey} = useOpenAI();
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputKey(e.target.value);
    setSaveStatus('idle');
  };

  const handleSaveKey = () => {
    try {
      setApiKey(inputKey);
      setSaveStatus('success');

      // Reset status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      setSaveStatus('error');
      console.error('Error saving API key:', error);
    }
  };

  const handleClearKey = () => {
    clearApiKey();
    setInputKey('');
    setSaveStatus('idle');
  };

  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  return (
    <div className='bg-white rounded-lg p-6 shadow-md'>
      <h2 className='text-xl font-semibold mb-4'>OpenAI API Settings</h2>

      <div className='mb-4'>
        <p className='text-sm text-gray-600 mb-2'>
          Enter your OpenAI API key to use the GPT Test functionality. Your API key is stored locally in your browser
          and never sent to our servers.
        </p>

        <div className='flex items-center mb-2'>
          <Input
            type={showApiKey ? 'text' : 'password'}
            value={inputKey}
            onChange={handleInputChange}
            placeholder='sk-...'
            className='flex-1 mr-2'
          />
          <Button onPress={toggleShowApiKey} variant='bordered' className='min-w-[80px] px-3'>
            {showApiKey ? 'Hide' : 'Show'}
          </Button>
        </div>

        {saveStatus === 'success' && <p className='text-sm text-green-600 mt-1'>API key saved successfully!</p>}

        {saveStatus === 'error' && (
          <p className='text-sm text-red-600 mt-1'>Failed to save API key. Please try again.</p>
        )}

        <div className='flex mt-4 space-x-2'>
          <Button onPress={handleSaveKey} color='primary' isDisabled={!inputKey.trim() || inputKey === apiKey}>
            Save API Key
          </Button>

          <Button onPress={handleClearKey} variant='bordered' color='danger' isDisabled={!apiKey}>
            Clear API Key
          </Button>
        </div>
      </div>

      <div className='mt-4 border-t pt-4'>
        <h3 className='text-md font-semibold mb-2'>Using Your API Key</h3>
        <p className='text-sm text-gray-600'>
          Your OpenAI API key is used to access the Assistants API for testing your GPT configurations. Usage will be
          billed to your OpenAI account based on your API usage.
        </p>
      </div>
    </div>
  );
}
