import React from "react";
import Hero from "@/components/sections/Hero";
import CGBroker from "@/components/sections/CGBroker";
import EASection from "@/components/sections/EASection";
import Indicators from "@/components/sections/Indicators";
import Tutorials from "@/components/sections/Tutorials";
import AboutJoin from "@/components/sections/AboutJoin";
import Footer from "@/components/sections/Footer";
import Header from "@/components/Header";

export default function Home() {
  return (
    <main data-testid="home-page" className="bg-obsidian-900 text-white animate-fade-in-page">
      <Header />
      <Hero />
      <EASection />
      <Indicators />
      <CGBroker />
      <Tutorials />
      <AboutJoin />
      <Footer />
    </main>
  );
}
