import Image from "next/image";

type Vote = "0" | "1" | "2" | "3" | "5" | "8" | "13" | "?" | "coffee";

type Participant = {
  id: string;
  name: string;
  role: "dev" | "qa" | "facilitator";
  vote: Vote | null;
};

type Story = {
  status: "pending" | "revealed";
  average: number | null;
};

type SessionData = {
  facilitatorId: string;
  participants: Participant[];
  currentStory: Story;
};

// Example mock payload for the Planning Poker UI to consume.
const mockSession: SessionData = {
  facilitatorId: "p1",
  currentStory: {
    status: "pending",
    average: null,
  },
  participants: [
    { id: "p1", name: "Avery", role: "dev", vote: "3" },
    { id: "p2", name: "Blake", role: "dev", vote: "5" },
    { id: "p3", name: "Casey", role: "dev", vote: "5" },
    { id: "p4", name: "Devon", role: "dev", vote: "8" },
    { id: "p5", name: "Eden", role: "qa", vote: "3" },
    { id: "p6", name: "Finley", role: "qa", vote: "?"  },
    { id: "p7", name: "Gray", role: "qa", vote: "5" },
    { id: "p8", name: "Harper", role: "dev", vote: null },
  ],
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-light-grey font-sans ">
      <header className="flex flex-col justify-center h-12 bg-orange w-full text-dark-blue text-center">
        First Onsite Planning Poker
      </header>
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="flex items-center gap-3 text-3xl font-semibold leading-10 tracking-tight text-dark-blue">
            <Image
              src="/logo.svg"
              alt="First Onsite logo"
              width={160}
              height={16}
            />
            <span>Planning Poker</span>
          </h1>
          <div>
            
          </div>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
        </div>
      </main>
    </div>
  );
}
