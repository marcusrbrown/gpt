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
            <h1 className='text-3xl text-center font-bold py-20'>Custom GPTs</h1>
            <div className='grid grid-cols-1 gap-1 md:grid-cols-2 lg:grid-cols-3'>
              <Card />
              <Card />
              <Card />
            </div>
          </main>
        </div>
      </Providers>
    </>
  );
}

export default App;
