import React from "react";
import type { Metadata, Viewport } from "next";
import { config } from "@fortawesome/fontawesome-svg-core";

import MetadataTags, { metadata as appMetadata } from "@/components/MetadataTags";
import StyledComponentsRegistry from "@/lib/styled-components.registry";
import { fonts } from "@/fonts";

import "@fortawesome/fontawesome-svg-core/styles.css";
import "@/styles/reset.css";
import "@/styles/globals.scss";

config.autoAddCss = false;

export const metadata: Metadata = appMetadata;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <MetadataTags />
      </head>
      <body className={fonts}>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}