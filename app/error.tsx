"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="centered"><h1>Something went wrong</h1><p>Please retry. Your financial data has not been displayed.</p><button onClick={reset}>Try again</button></main>; }
