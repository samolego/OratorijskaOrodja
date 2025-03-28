import type { NextConfig } from "next";

/* This file will get overwritten by the build process on Github pages! */
const nextConfig: NextConfig = {
  /* config options here */
  basePath: "/OratorijskaOrodja",
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
