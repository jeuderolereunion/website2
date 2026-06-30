"use client";

import { useState, useEffect } from "react";
import styled from "styled-components";
import Link from "next/link";
import { Container } from '@/components/Container';

const trailers = [
{
id: 1,
title: "Bienvenue chez JDR Réunion",
subtitle: "Découvrez notre communauté de joueurs de rôle à La Réunion",
image: "/images/Carroussel1.png",
link: "/presentation",
},
{
id: 2,
title: "Un film une série un scénario",
subtitle: "Mario,Le Silo et bien plus encore ",
image: "/images/Carroussel2.png",
link: "/evenements/soirees-jdr",
},
{
id: 3,
title: "Tournois & Événements",
subtitle: "Rencontrez d'autres passionnés et vivez l'aventure",
image: "/images/banner3.webp",
link: "/evenements",
},
];

const Hero = styled.section`
position: relative;
width: 100%;
height: 750px;
overflow: hidden;
border-radius: 20px;

@media (max-width: 768px) {
height: 720px;
}
`;

const Slide = styled.div<{ $image: string; $active: boolean }>`
position: absolute;
inset: 0;

opacity: ${(p) => (p.$active ? 1 : 0)};
transition: opacity 0.8s ease;

background:
linear-gradient(
rgba(0, 0, 0, 0.35),
rgba(0, 0, 0, 0.8)
),
url(${(p) => p.$image});

background-size: cover;
background-position: center;
`;

const Content = styled.div`
position: absolute;
left: 60px;
bottom: 80px;
max-width: 650px;
z-index: 2;

@media (max-width: 768px) {
left: 25px;
right: 25px;
bottom: 60px;
}
`;

const Title = styled.h2`  font-size: clamp(2rem, 5vw, 4rem);
  color: white;
  margin: 0 0 1rem;`;

const Subtitle = styled.p`  font-size: 1.1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 1.5rem;`;

const Button = styled(Link)`
display: inline-block;
padding: 12px 24px;
border-radius: 12px;
background: var(--theme-color-gold);
color: black;
text-decoration: none;
font-weight: 700;
transition: transform 0.2s ease;

&:hover {
transform: translateY(-2px);
}
`;

const Controls = styled.div`  position: absolute;
  right: 25px;
  bottom: 25px;
  display: flex;
  gap: 10px;
  z-index: 5;`;

const NavButton = styled.button`
width: 42px;
height: 42px;
border-radius: 50%;
border: none;
cursor: pointer;
font-size: 1rem;

background: rgba(255,255,255,0.85);

&:hover {
background: white;
}
`;

const Dots = styled.div`  position: absolute;
  left: 50%;
  bottom: 35px;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 5;`;

const Dot = styled.button<{ $active: boolean }>`
width: 12px;
height: 12px;
border-radius: 50%;
border: none;
cursor: pointer;

background: ${(p) =>
p.$active
? "white"
: "rgba(255,255,255,0.4)"};

transition: all 0.2s ease;
`;

export default function HeroCarousel() {
const [current, setCurrent] = useState(0);

useEffect(() => {
  const timer = setInterval(() => {
    setCurrent((prev) => (prev + 1) % trailers.length);
  }, 5000);

  return () => clearInterval(timer);
}, []);




const next = () => {
setCurrent((prev) => (prev + 1) % trailers.length);
};

const prev = () => {
setCurrent((prev) =>
prev === 0 ? trailers.length - 1 : prev - 1
);
};

return (
<Container id="home">
  <Hero>
    {trailers.map((slide, index) => (
      <Slide
        key={slide.id}
        $image={slide.image}
        $active={index === current}
      >
        {index === current && (
          <Content>
            <Title>{slide.title}</Title>

            <Subtitle>
              {slide.subtitle}
            </Subtitle>

            <Button href={slide.link}>
              Découvrir
            </Button>
          </Content>
        )}
      </Slide>
    ))}

    <Dots>
      {trailers.map((_, index) => (
        <Dot
          key={index}
          $active={index === current}
          onClick={() => setCurrent(index)}
          aria-label={`Slide ${index + 1}`}
        />
      ))}
    </Dots>

    <Controls>
      <NavButton
        type="button"
        onClick={prev}
        aria-label="Précédent"
      >
        ←
      </NavButton>

      <NavButton
        type="button"
        onClick={next}
        aria-label="Suivant"
      >
        →
      </NavButton>
    </Controls>
  </Hero>
  </Container>
);
}