import {
  Avatar,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Divider,
  Image,
  Link,
  Navbar,
  NavbarContent,
  NavbarItem,
} from '@nextui-org/react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

function App() {
  return (
    <>
      <main className="text-foreground bg-background">
        <Navbar>
          <NavbarContent>
            <NavbarItem>
              <Link isExternal href="https://vitejs.dev">
                <Image src={viteLogo} className="logo" alt="Vite logo" />
              </Link>
            </NavbarItem>
            <NavbarItem>
              <Link isExternal href="https://react.dev">
                <Image src={reactLogo} className="logo react" alt="React logo" />
              </Link>
            </NavbarItem>
          </NavbarContent>
        </Navbar>
        <h1 className="text-3xl font-bold py-20">GPT Stuff</h1>
        <Card className="max-w-[400px]">
          <CardHeader className="flex gap-3">
            <Avatar
              alt="GPT Logo"
              isBordered
              radius="full"
              size="lg"
              src="https://files.oaiusercontent.com/file-Oz0yX2PZlcuhJJBeSpJSGkCC?se=2123-10-18T19%3A01%3A39Z&sp=r&sv=2021-08-06&sr=b&rscc=max-age%3D31536000%2C%20immutable&rscd=attachment%3B%20filename%3D5f8aa2f0-2a0a-4dbd-8c54-861e7625b8fe.png&sig=511Iyj7EEljUU8Zbv2dRFKDCyWNXuQJRQ49EBFBv6d0%3D"
            />
            <div className="flex flex-col gap items-center">
              <p className="text-md">🏛️ GPT Architect (Advanced Model)</p>
              <p className="text-small">
                By{' '}
                <Link href="https://gpt.mrbro.dev" isExternal showAnchorIcon>
                  gpt.mrbro.dev
                </Link>
              </p>
            </div>
          </CardHeader>
          <Divider />
          <CardBody>
            <p>Expertly Crafting Your GPT From Concept to Masterpiece</p>
          </CardBody>
          <Divider />
          <CardFooter>
            <Link href="https://chat.openai.com/g/g-7uYB9WE9l-gpt-architect-advanced-model" isExternal showAnchorIcon>
              Chat
            </Link>
          </CardFooter>
        </Card>
      </main>
    </>
  );
}

export default App;
