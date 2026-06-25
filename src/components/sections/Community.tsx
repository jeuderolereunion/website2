"use client";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiscord, faWhatsapp, faFacebook, faInstagram } from "@fortawesome/free-brands-svg-icons";
import { Container } from '@/components/Container';

const Content = styled.div`
  max-width: 820px;
  padding: 0 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  position: relative;
  z-index: 1;

  @media (max-width: 640px) {
    gap: 1rem;
  }
`;

const Title = styled.h2`
  font-size: clamp(2rem, 4vw, 3rem);
  margin: 0;

  @media (max-width: 640px) {
    font-size: 1.5rem;
  }
`;

const Description = styled.p`
  margin: 0;
  font-size: clamp(1rem, 1.9vw, 1.25rem);
  line-height: 1.5;
  max-width: 560px;
  color: rgba(255, 255, 255, 0.85);

  @media (max-width: 640px) {
    font-size: 0.85rem;
    line-height: 1.4;
  }
`;

const IframeWrapper = styled.div`
  width: 100%;
  max-width: 400px;
  overflow: hidden;
  border-radius: 12px;
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
  justify-content: center;
  width: 100%;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
`;

const Card = styled.a<{ $brandColor: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid ${({ $brandColor }) => `${$brandColor}55`};
  border-radius: 16px;
  color: #fff;
  padding: 1.75rem 1rem;
  text-decoration: none;
  transition: transform 150ms ease, background 150ms ease, border-color 150ms ease,
    box-shadow 150ms ease;
  &:hover {
    background: ${({ $brandColor }) => `${$brandColor}22`};
    border-color: ${({ $brandColor }) => `${$brandColor}cc`};
    box-shadow: 0 0 18px ${({ $brandColor }) => `${$brandColor}44`};
    transform: translateY(-4px);
  }
  &:focus-visible {
    outline: 2px solid ${({ $brandColor }) => $brandColor};
    outline-offset: 3px;
  }

  @media (max-width: 640px) {
    padding: 1rem 0.75rem;
    gap: 0.5rem;
  }
`;

const CardIcon = styled(FontAwesomeIcon)<{ $brandColor: string }>`
  color: ${({ $brandColor }) => $brandColor};
  font-size: 2.5rem;
  width: 2.5rem !important;
  height: 2.5rem !important;

  @media (max-width: 640px) {
    font-size: 1.75rem;
    width: 1.75rem !important;
    height: 1.75rem !important;
  }
`;

const CardLabel = styled.span`
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.04em;

  @media (max-width: 640px) {
    font-size: 0.8rem;
  }
`;

const platforms = [
  {
    label: "Discord",
    icon: faDiscord,
    color: "#5865F2",
    href: "https://discord.gg/ZtHDCt7RdY",
  },
  {
    label: "WhatsApp",
    icon: faWhatsapp,
    color: "#25D366",
    href: "https://chat.whatsapp.com/BYxPsD4aakJ8Gw5cUHo6ie",
  },
  {
    label: "Facebook",
    icon: faFacebook,
    color: "#1877F2",
    href: "https://www.facebook.com/profile.php?id=61575292150404",
  },
  {
    label: "Instagram",
    icon: faInstagram,
    color: "#f311ba",
    href: "https://www.instagram.com/jeuderolereunion/",
  },
];

export default function Community() {
  return (
    <Container id="community">
      <Content>
        <Title>🌍 Rejoins la Communauté</Title>
        <Description>
          Retrouve tous les membres de JDR Réunion sur nos espaces communautaires.
          Discutez, partagez et organisez vos prochaines aventures.
        </Description>
        <IframeWrapper>
          <iframe
            id="haWidgetButton"
            allowTransparency={true}
            src="https://www.helloasso.com/associations/jdr-reunion/adhesions/adhesion-2026/widget-bouton"
            style={{ width: '100%', height: '70px', border: 'none', display: 'block' }}
          />
        </IframeWrapper>
        <Cards>
          {platforms.map(({ label, icon, color, href }) => (
            <Card
              key={label}
              href={href}
              $brandColor={color}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Rejoindre ${label}`}
            >
              <CardIcon icon={icon} $brandColor={color} />
              <CardLabel>{label}</CardLabel>
            </Card>
          ))}
        </Cards>
      </Content>
    </Container>
  );
}