import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SparkBurst, SparkCluster } from "@/components/SparkBurst";
import { TickerStrip } from "@/components/TickerStrip";
import rallyWaving from "../../../public/mascot/rally-waving.png";

export function Hero() {
  return (
    <section className="pt-4 pb-12 sm:pt-6 sm:pb-16 lg:pt-8 lg:pb-20">
      <Container>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-8">
          <div>
            <TickerStrip
              items={[
                { symbol: "SPCX", direction: "up" },
                { symbol: "RDDT", direction: "up" },
                { symbol: "AMC", direction: "down" },
              ]}
              className="mb-8"
            />

            <h1 className="font-display text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
              Send a friend
              <br />
              real stock.
              <br />
              <span className="text-coral">Like, actually real.</span>
            </h1>

            <p className="mt-6 max-w-md text-lg text-ink/70 lg:text-xl">
              Pick a stock, pick an amount, send a link - onboard your friends.
            </p>

            {/* Centering wrapper is kept separate from the positioning
                wrapper below — flex-centering this outer div directly
                would stretch it to the column's full width, and the
                sparks' left-0/left-full anchors would then land on that
                wide box's edges instead of the button's actual edges. */}
            <div className="mt-8 flex justify-center sm:block">
              <div className="relative inline-block">
                <SparkBurst />
                <Button href="/gift" className="px-14 lg:px-20 lg:py-5 lg:text-xl">
                  Send a gift
                </Button>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            {/* Contact shadow — grounds Rally instead of letting him float. */}
            <div
              aria-hidden
              className="absolute bottom-4 h-8 w-56 rounded-full bg-ink/25 blur-2xl sm:w-64 lg:w-72"
            />
            <div className="relative w-64 sm:w-80 lg:w-96">
              <Image
                src={rallyWaving}
                alt="Rally, ChainStock's mascot, waving hello"
                priority
                className="relative w-full drop-shadow-[0_20px_25px_rgba(33,27,29,0.25)]"
              />
              {/* Spark cluster near Rally's raised hand — matches docs/mockup/landing.png */}
              <div className="absolute left-[2%] top-[28%]">
                <SparkCluster anchor="left" variant="wrap" />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
