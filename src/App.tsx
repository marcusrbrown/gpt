import {Card} from '@/components/card';
import {Navbar} from '@/components/navbar';
import {Providers} from './providers';

function App() {
  return (
    <>
      <Providers>
        <div className='relative flex flex-col h-screen'>
          <Navbar />
          <main className='container mx-auto px-12 flex-grow'>
            <h1 className='text-3xl font-bold py-20'>GPT Stuff</h1>
            <Card />
          </main>
        </div>
      </Providers>
    </>
  );
}

export default App;
