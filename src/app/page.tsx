import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";

export default function LandingPage() {
  return (
    <>
      <Header />
      <Hero />
      <FeatureGrid />
      <Footer />
    </>
  );
}