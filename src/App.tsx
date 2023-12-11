import {CardGroup} from '@/components/card-group';
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
            <CardGroup />
          </main>
        </div>
      </Providers>
    </>
  );
}

export default App;
