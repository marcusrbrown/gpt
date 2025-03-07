import {useState, useEffect} from 'react';
import {useStorage} from '../hooks/use-storage';
import {GPTConfiguration, GPTCapabilities} from '../types/gpt';
import {v4 as uuidv4} from 'uuid';

interface GPTEditorProps {
  gptId?: string;
  onSave?: (gpt: GPTConfiguration) => void;
}

const DEFAULT_GPT: Omit<GPTConfiguration, 'id'> = {
  name: '',
  description: '',
  systemPrompt: '',
  tools: [],
  knowledge: {
    files: [],
    urls: [],
  },
  capabilities: {
    codeInterpreter: false,
    webBrowsing: false,
    imageGeneration: false,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
};

export function GPTEditor({gptId, onSave}: GPTEditorProps) {
  const {getGPT, saveGPT} = useStorage();
  const [gpt, setGpt] = useState<GPTConfiguration>(() => {
    if (gptId) {
      const existing = getGPT(gptId);
      return existing || {...DEFAULT_GPT, id: uuidv4()};
    }
    return {...DEFAULT_GPT, id: uuidv4()};
  });

  useEffect(() => {
    if (gptId) {
      const existing = getGPT(gptId);
      if (existing) {
        setGpt(existing);
      }
    }
  }, [gptId, getGPT]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name, value} = e.target;
    setGpt((prev) => ({
      ...prev,
      [name]: value,
      updatedAt: new Date(),
    }));
  };

  const handleCapabilityChange = (capability: keyof GPTCapabilities) => {
    setGpt((prev) => ({
      ...prev,
      capabilities: {
        ...prev.capabilities,
        [capability]: !prev.capabilities[capability],
      },
      updatedAt: new Date(),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveGPT(gpt);
    onSave?.(gpt);
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div>
        <label htmlFor='name' className='block text-sm font-medium text-gray-700'>
          Name
        </label>
        <input
          type='text'
          name='name'
          id='name'
          value={gpt.name}
          onChange={handleInputChange}
          className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
          required
        />
      </div>

      <div>
        <label htmlFor='description' className='block text-sm font-medium text-gray-700'>
          Description
        </label>
        <textarea
          name='description'
          id='description'
          value={gpt.description}
          onChange={handleInputChange}
          rows={3}
          className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
          required
        />
      </div>

      <div>
        <label htmlFor='systemPrompt' className='block text-sm font-medium text-gray-700'>
          System Prompt
        </label>
        <textarea
          name='systemPrompt'
          id='systemPrompt'
          value={gpt.systemPrompt}
          onChange={handleInputChange}
          rows={5}
          className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm'
          required
        />
      </div>

      <div>
        <label className='block text-sm font-medium text-gray-700'>Capabilities</label>
        <div className='mt-2 space-y-2'>
          {Object.entries(gpt.capabilities).map(([key, value]) => (
            <div key={key} className='flex items-center'>
              <input
                type='checkbox'
                id={key}
                checked={value}
                onChange={() => handleCapabilityChange(key as keyof GPTCapabilities)}
                className='h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500'
              />
              <label htmlFor={key} className='ml-2 block text-sm text-gray-900'>
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className='flex justify-end'>
        <button
          type='submit'
          className='ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
        >
          Save GPT
        </button>
      </div>
    </form>
  );
}
