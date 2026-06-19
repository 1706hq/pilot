"use client";

import { FormEvent, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function Home() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    setGreetMsg(await invoke<string>("greet", { name }));
  }

  return (
    <main className="container">
      <h1>Welcome to Tauri + Next.js</h1>

      <div className="row">
        <a href="https://nextjs.org" target="_blank" rel="noreferrer">
          <span className="logo next" aria-label="Next.js logo">
            N
          </span>
        </a>
        <a href="https://tauri.app" target="_blank" rel="noreferrer">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src="/react.svg" className="logo react" alt="React logo" />
        </a>
      </div>
      <p>Click on the Next.js, Tauri, and React logos to learn more.</p>

      <form
        className="row"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <p>{greetMsg}</p>
    </main>
  );
}
