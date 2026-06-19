import Navigation from '@/components/Navigation';
import { Main } from '@/components/semantic/Main';
import AppLayoutElement from '@/components/AppLayoutElement';
import Home from '@/components/sections/Home';
import Events from '@/components/sections/Events';
import Community from '@/components/sections/Community';
import About from '@/components/sections/About';

export default function Page() {
  return (
    <>
      <Navigation />
      <Main>
        <AppLayoutElement>
          <Home />
        </AppLayoutElement>
        <AppLayoutElement>
          <Events />
        </AppLayoutElement>
        
        <AppLayoutElement>
          <Community />
        </AppLayoutElement>
        <AppLayoutElement>
          <About />
        </AppLayoutElement>
      </Main>
    </>
  );
}
