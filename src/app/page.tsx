import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";

export default function LandingPage() {
  return (
    <>
      <Header />
      <Hero />
      <FeatureGrid />
    </>
  );
}